import {CronJob} from "cron";
import got, {HTTPError} from "got";
import {Candles, CoinAlerts, LatestCoins, mongoClient} from "../database";
import {CoinMetadata, symbolToMeta} from "../structs/coinMetadata";
import {cryptoMetadataList, validCryptos} from "../utils";
import {Candle} from "../structs/candle";
import {AnyBulkWriteOperation} from "mongodb";
import {LatestCoin} from "../structs/latestCoin";
import {notifyExpiredAlerts, notifyUsers} from "./alertChecker";

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
export let processing = false;
export let lastUpdated = 0;
function getCmcKey() {
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
    if (processing) {
        return;
    }
    lastUpdated = Date.now();
    processing = true;
    const session = mongoClient.startSession();
    const start1 = Date.now();
    const newValidCryptos: CoinMetadata[] = [];
    await session.withTransaction(async () => {
        const coinResponse = await got("https://api.binance.com/api/v3/exchangeInfo?permissions=SPOT", {
            headers: {
                "Accept": "application/json",
                "Accept-Encoding": "deflate, gzip"
            }
        }).text();
        let symbols: any[] = JSON.parse(coinResponse).symbols.filter((symbol: any) => symbol.status === "TRADING" && symbol.quoteAsset == "USDT");
        const exclude: string[] = [];
        let metadata: any[] = [];
        try {
            metadata = JSON.parse(await got("https://pro-api.coinmarketcap.com/v1/cryptocurrency/map?" + new URLSearchParams({
                symbol: symbols.map(symbol => symbol.baseAsset).join(",")
            }), {
                headers: {
                    "X-CMC_PRO_API_KEY": getCmcKey(),
                    Accept: "application/json",
                    "Accept-Encoding": "deflate, gzip"
                }
            }).text()).data;
        } catch (e) {
            const error = JSON.parse((e as HTTPError).response.body as string);
            if (error.status.error_code == 400 && error.status.error_message.startsWith("Invalid values for \"symbol\": ")) {
                (error.status.error_message as string).substring(29).replaceAll("\"", "").split(",").forEach(symbol => exclude.push(symbol));
                metadata = JSON.parse(await got("https://pro-api.coinmarketcap.com/v1/cryptocurrency/map?" + new URLSearchParams({
                    symbol: symbols.map(symbol => symbol.baseAsset).filter(symbol => !exclude.includes(symbol)).join(",")
                }), {
                    headers: {
                        "X-CMC_PRO_API_KEY": getCmcKey(),
                        Accept: "application/json",
                        "Accept-Encoding": "deflate, gzip"
                    }
                }).text()).data;
                console.log(`Excluded ${exclude.length} coins`);
            } else {
                throw new Error(JSON.stringify((e as HTTPError).response.body));
            }
        }
        symbols = symbols.filter(symbol => !exclude.includes(symbol.baseAsset));
        cryptoMetadataList.length = 0;
        cryptoMetadataList.push(...metadata.map(meta => {
            return {
                cmc_id: meta.id,
                symbol: meta.symbol,
                name: meta.name,
                slug: meta.slug
            } as CoinMetadata;
        }));
        if (symbols.length >= 500) {
            //500 reqs for candles and 600 (rounds up) for 7d rolling price change
            throw new Error(`Too many coins to insert (${symbols.length})`);
        }
        const binancePromises = [];
        let weightUsed = 0;
        binancePromises.push(...symbols.map(async symbol => {
            weightUsed++;
            return got(`https://api.binance.com/api/v3/klines?symbol=${symbol.symbol}&interval=1d&limit=${await getLimit(symbolToMeta(symbol.baseAsset).cmc_id)}`, {
                headers: {
                    "Accept": "application/json",
                    "Accept-Encoding": "deflate, gzip"
                },
                retry: {}
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
            binancePromises.push(got(`https://api.binance.com/api/v3/ticker?symbols=["${symbols.slice(i, i + 100).map(symbol => symbol.symbol).join("\",\"")}"]&windowSize=7d`, {
                headers: {
                    "Accept": "application/json",
                    "Accept-Encoding": "deflate, gzip"
                },
                retry: {}
            }).text().then(response => {
                return {
                    type: "7d%",
                    response: response
                };
            }));
        }
        console.log(`Weight used: ${weightUsed}/1200`);
        const responses = await Promise.all(binancePromises);
        const promises = [];
        for (const response of responses) {
            const toWrite: AnyBulkWriteOperation<Candle>[] = [];
            const json = JSON.parse(response.response);
            if (response.type == "candles") {
                const coin = symbolToMeta((response as any).coin);
                newValidCryptos.push(coin);
                for (let i = 0; i < json.length; i++) {
                    const item = json[i];
                    const candle = {
                        _id: `${coin.cmc_id}_${item[0]}`,
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
                            filter: {_id: candle._id},
                            replacement: candle,
                            upsert: true
                        }
                    });
                }
                promises.push(Candles.bulkWrite(toWrite));
            } else if (response.type == "7d%") {
                const toWrite: AnyBulkWriteOperation<LatestCoin>[] = [];
                for (const item of json) {
                    const coin = symbolToMeta(item.symbol.replace("USDT", ""));
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

    if (newValidCryptos.length == 0) {
        console.log("newValidCryptos is empty?");
        processing = false;
        return;
    }
    validCryptos.length = 0;
    validCryptos.push(...newValidCryptos);
    console.log(`Updated coins (${validCryptos.length} valid, ${cryptoMetadataList.length - validCryptos.length} invalid) in ${Date.now() - start1} ms`);

    const expired = await CoinAlerts.find({coin: {$nin: validCryptos.map(meta => meta.cmc_id)}}).toArray();
    await CoinAlerts.deleteMany({coin: {$nin: validCryptos.map(meta => meta.cmc_id)}});
    const removedCoins = expired.map(alert => alert.coin);
    if (removedCoins.length > 0) {
        console.log(`Removed ${removedCoins.length} expired alerts for ${removedCoins.join(", ")}`);
    }
    await notifyExpiredAlerts(expired.map(alert => alert.user), expired);
    await notifyUsers();
    processing = false;
}

export async function getLimit(coin: number) {
    const result = await Candles.findOne({coin: coin}, {sort: {open_time: -1}});
    if (!result) {
        return 1000;
    }
    return Math.min(1000, Math.ceil((Date.now() - result.open_time) / (24 * 60 * 60 * 1000)));
}

