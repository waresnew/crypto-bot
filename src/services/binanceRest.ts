/* istanbul ignore file */
import {CronJob} from "cron";
import got, {HTTPError} from "got";
import {Candles, LatestCoins, mongoClient} from "../utils/database";
import {CoinMetadata} from "../structs/coinMetadata";
import {Candle} from "../structs/candle";
import {AnyBulkWriteOperation} from "mongodb";
import {LatestCoin} from "../structs/latestCoin";
import {notifyExpiredCoins, triggerAlerts} from "./alertChecker";
import {getBinanceRestUrl, validCryptos} from "../utils/coinUtils";

export const binanceApiCron = new CronJob(
    "* * * * *",
    updateBinanceApi,
    null,
    false,
    "UTC"
);

export const cleanBinanceCacheCron = new CronJob(
    "0 0 1 * *",
    cleanCoinDb,
    null,
    false,
    "UTC"
);
let cmcKeyIndex = 1;
export let binanceLastUpdated = 0;

export function getCmcKey() {
    const key = process.env[`COINMARKETCAP_KEY${cmcKeyIndex}`];
    cmcKeyIndex++;
    if (cmcKeyIndex > 5) {
        cmcKeyIndex = 1;
    }
    return key;
}

export async function cleanCoinDb() {
    const start = Date.now();
    const result = await Candles.deleteMany({open_time: {$lt: Date.now() - 1000 * 60 * 60 * 24 * 1000}});
    console.log(`Deleted ${result.deletedCount} old candles in ${Date.now() - start} ms`);
}

export async function updateBinanceApi() {
    const start1 = Date.now();
    const newValidCryptos: CoinMetadata[] = [];
    const coinResponse = await got(`${getBinanceRestUrl()}/api/v3/exchangeInfo?permissions=SPOT`, {
        headers: {
            "Accept": "application/json",
            "Accept-Encoding": "deflate, gzip"
        }
    }).text();
    let symbols: any[] = JSON.parse(coinResponse).symbols.filter((symbol: any) => symbol.status === "TRADING" && symbol.quoteAsset == "USDT");
    const exclude: string[] = [];
    let metadata: any[] = [];
    try {
        const array: any[] = JSON.parse(await got("https://pro-api.coinmarketcap.com/v1/cryptocurrency/map?" + new URLSearchParams({
            symbol: symbols.map(symbol => symbol.baseAsset).join(",")
        }), {
            headers: {
                "X-CMC_PRO_API_KEY": getCmcKey(),
                Accept: "application/json",
                "Accept-Encoding": "deflate, gzip"
            }
        }).text()).data;
        metadata = array.map(meta => {
            return {
                cmc_id: meta.id,
                symbol: meta.symbol,
                name: meta.name,
                slug: meta.slug
            } as CoinMetadata;
        });
    } catch (e) {
        const error = JSON.parse((e as HTTPError).response.body as string);
        if (error.status.error_code == 400 && error.status.error_message.startsWith("Invalid values for \"symbol\": ")) {
            (error.status.error_message as string).substring(29).replaceAll("\"", "").split(",").forEach(symbol => exclude.push(symbol));
            const array: any[] = JSON.parse(await got("https://pro-api.coinmarketcap.com/v1/cryptocurrency/map?" + new URLSearchParams({
                symbol: symbols.map(symbol => symbol.baseAsset).filter(symbol => !exclude.includes(symbol)).join(",")
            }), {
                headers: {
                    "X-CMC_PRO_API_KEY": getCmcKey(),
                    Accept: "application/json",
                    "Accept-Encoding": "deflate, gzip"
                }
            }).text()).data;
            metadata = array.map(meta => {
                return {
                    cmc_id: meta.id,
                    symbol: meta.symbol,
                    name: meta.name,
                    slug: meta.slug
                } as CoinMetadata;
            });
            console.log(`Excluded ${exclude.length} coins`);
        } else {
            throw new Error(JSON.stringify((e as HTTPError).response.body));
        }
    }
    symbols = symbols.filter(symbol => !exclude.includes(symbol.baseAsset));
    if (symbols.length >= 500) {
        //500 reqs for candles and 600 (rounds up) for 7d rolling price change
        throw new Error(`Too many coins to insert (${symbols.length})`);
    }
    const binancePromises = [];
    let weightUsed = 0;
    binancePromises.push(...symbols.map(async symbol => {
        weightUsed++;
        return got(`${getBinanceRestUrl()}/api/v3/klines?symbol=${symbol.symbol}&interval=1d&limit=${await getLimit(metadata.find(meta => meta.symbol == symbol.baseAsset).cmc_id)}`, {
            headers: {
                "Accept": "application/json",
                "Accept-Encoding": "deflate, gzip"
            }
        }).text().then(response => {
            return {
                type: "candles",
                coin: symbol.baseAsset,
                response: response
            };
        });
    }));
    for (let i = 0; i < symbols.length; i += 100) {
        weightUsed += symbols.slice(i, i + 100).length >= 50 ? 100 : symbols.slice(i, i + 100).length * 2;
        binancePromises.push(got(`${getBinanceRestUrl()}/api/v3/ticker?symbols=["${symbols.slice(i, i + 100).map(symbol => symbol.symbol).join("\",\"")}"]&windowSize=7d`, {
            headers: {
                "Accept": "application/json",
                "Accept-Encoding": "deflate, gzip"
            }
        }).text().then(response => {
            return {
                type: "7d%",
                response: response
            };
        }));
    }
    console.log(`Weight used: ${weightUsed}/1200`);
    const responses = await Promise.all(binancePromises);
    const start2 = Date.now();
    const session = mongoClient.startSession();
    await session.withTransaction(async () => {
        const promises = [];
        for (const response of responses) {
            const toWrite: AnyBulkWriteOperation<Candle>[] = [];
            const json = JSON.parse(response.response);
            if (response.type == "candles") {
                const coin = metadata.find(meta => meta.symbol == (response as any).coin);
                newValidCryptos.push(coin);
                for (let i = 0; i < json.length; i++) {
                    const item = json[i];
                    const candle = {
                        coin: coin.cmc_id,
                        open_time: item[0],
                        open_price: parseFloat(item[1]),
                        high_price: parseFloat(item[2]),
                        low_price: parseFloat(item[3]),
                        close_price: parseFloat(item[4]),
                        base_volume: parseFloat(item[5]),
                        close_time: parseFloat(item[6]),
                        quote_volume: parseFloat(item[7]),
                        trades_count: item[8],
                        taker_base_volume: parseFloat(item[9]),
                        taker_quote_volume: parseFloat(item[10]),
                        ignore: item[11]
                    };
                    toWrite.push({
                        replaceOne: {
                            filter: {coin: candle.coin, open_time: candle.open_time},
                            replacement: candle,
                            upsert: true
                        }
                    });
                }
                promises.push(Candles.bulkWrite(toWrite));
            } else if (response.type == "7d%") {
                const toWrite: AnyBulkWriteOperation<LatestCoin>[] = [];
                for (const item of json) {
                    const coin = metadata.find(meta => meta.symbol == item.symbol.replace("USDT", ""));
                    toWrite.push({
                        updateOne: {
                            filter: {coin: coin.cmc_id},
                            update: {
                                $set: {
                                    weekPriceChangePercent: item.priceChangePercent,
                                    weekWeightedAvgPrice: item.weightedAvgPrice,
                                    weekHighPrice: item.highPrice,
                                    weekLowPrice: item.lowPrice
                                }
                            },
                            upsert: true
                        }
                    });
                }
                promises.push(LatestCoins.bulkWrite(toWrite));
            }
        }
        return Promise.all(promises);
    });
    const start3 = Date.now();
    if (newValidCryptos.length == 0) {
        console.error("newValidCryptos is empty?");
        return;
    }
    const oldCryptos = validCryptos.slice();
    validCryptos.length = 0;
    validCryptos.push(...newValidCryptos);
    const start4 = Date.now();
    await notifyExpiredCoins(oldCryptos);
    await triggerAlerts();
    binanceLastUpdated = Date.now();
    console.log(`Binance REST @ ${new Date().toISOString()}:
        ${start2 - start1} ms to get data
        ${start3 - start2} ms to write to db (${validCryptos.length} valid, ${metadata.length - validCryptos.length} invalid)
        ${start4 - start3} ms to update valid cryptos
        ${Date.now() - start4} ms to trigger alerts`);
}

export async function getLimit(coin: number) {
    const result = await Candles.findOne({coin: coin}, {sort: {open_time: -1}});
    if (!result) {
        return 1000;
    }
    return 1 + Math.min(1000, Math.ceil((Date.now() - result.open_time) / (24 * 60 * 60 * 1000)));
}

