import {CronJob} from "cron";
import got, {HTTPError} from "got";
import {Candles, CoinAlerts, LatestCoins, mongoClient} from "../database";
import {CoinMetadata, symbolToMeta} from "../structs/coinMetadata";
import {cryptoMetadataList, validCryptos} from "../utils";
import {Candle} from "../structs/candle";
import {AnyBulkWriteOperation} from "mongodb";

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
    const latest = await LatestCoins.deleteMany({open_time: {$lt: Date.now() - 1000 * 60 * 60 * 24 * 2}});
    console.log(`Deleted ${result.deletedCount} old candles and ${latest.deletedCount} old minute candles in ${Date.now() - start} ms`);
}

export async function updateBinanceApi() {
    if (processing) {
        return;
    }
    processing = true;
    const session = mongoClient.startSession();
    const start1 = Date.now();
    await session.withTransaction(async () => {
        const coinResponse = await got("https://api.binance.com/api/v3/exchangeInfo?permissions=SPOT", {
            headers: {
                "Accept": "application/json",
                "Accept-Encoding": "deflate, gzip"
            }
        }).text();
        const symbols: any[] = JSON.parse(coinResponse).symbols.filter((symbol: any) => symbol.status === "TRADING" && symbol.quoteAsset == "USDT");
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
        cryptoMetadataList.length = 0;
        cryptoMetadataList.push(...metadata.map(meta => {
            return {
                cmc_id: meta.id,
                symbol: meta.symbol,
                name: meta.name
            } as CoinMetadata;
        }));
        const responses = await Promise.all(symbols.filter(symbol => !exclude.includes(symbol.baseAsset)).map(async symbol => {
            return got(`https://api.binance.com/api/v3/klines?symbol=${symbol.symbol}&interval=1d&limit=${await getLimit(symbolToMeta(symbol.baseAsset).cmc_id)}`, {
                headers: {
                    "Accept": "application/json",
                    "Accept-Encoding": "deflate, gzip"
                }
            }).text().then(response => {
                return {
                    coin: symbol.baseAsset,
                    response: response
                };
            });
        }));
        if (responses.length >= 1000) {
            throw new Error(`Too many coins to insert (${responses.length})`);
        }
        const promises = [];
        const existingLatestCandles = await Candles.find({_id: {$in: symbols.filter(symbol => !exclude.includes(symbol.baseAsset)).map(symbol => `${symbolToMeta(symbol.baseAsset).cmc_id}_${Math.floor(Date.now() / 86400000) * 86400000}`)}}).toArray();
        const existingCandlesSet = new Set(existingLatestCandles.map(candle => candle._id));
        for (const response of responses) {
            const toWrite: AnyBulkWriteOperation<Candle>[] = [];
            const json = JSON.parse(response.response);
            const coin = symbolToMeta(response.coin);
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
                if (i == json.length - 1) {
                    validCryptos.push(coin);
                    promises.push(LatestCoins.insertOne({
                        coin: candle.coin,
                        open_time: Math.floor(Date.now() / 60000) * 60000,
                        price: candle.close_price,
                        volume: candle.quote_volume
                    }));
                }
                toWrite.push({
                    replaceOne: {
                        filter: {_id: candle._id},
                        replacement: candle,
                        upsert: true
                    }
                });
                //     if (candle.open_time >= Date.now() - 1000 * 60 * 60 * 24) {
                //         if (!existingCandlesSet.has(candle._id)) {
                //             toWrite.push({
                //                 insertOne: {
                //                     document: candle
                //                 }
                //             });
                //         } else {
                //             toWrite.push({
                //                 updateOne: {
                //                     filter: {_id: candle._id},
                //                     update: {
                //                         $set: {
                //                             open_price: candle.open_price,
                //                             high_price: candle.high_price,
                //                             low_price: candle.low_price,
                //                             close_price: candle.close_price,
                //                             base_volume: candle.base_volume,
                //                             close_time: candle.close_time,
                //                             quote_volume: candle.quote_volume,
                //                             trades_count: candle.trades_count,
                //                             taker_base_volume: candle.taker_base_volume,
                //                             taker_quote_volume: candle.taker_quote_volume,
                //                             ignore: candle.ignore
                //                         }
                //                     }
                //                 }
                //             });
                //         }
                //     } else {
                //         toWrite.push({
                //             insertOne: {
                //                 document: candle
                //             }
                //         });
                //     }
            }
            promises.push(Candles.bulkWrite(toWrite));
        }
        return Promise.all(promises);
    });

    const excluded2 = 0;
    // for (const meta of cryptoMetadataList) {
    //     const oldest = await LatestCoins.findOne({coin: meta.cmc_id}, {sort: {open_time: 1}});
    //     if (!oldest) {
    //         excluded2++;
    //         continue;
    //     }
    //     if (oldest.open_time <= Date.now() - 1000 * 60 * 60 * 24) {
    //         validCryptos.push(meta);
    //     }
    // }
    console.log(`Updated coins (${validCryptos.length} valid, ${cryptoMetadataList.length - validCryptos.length - excluded2} invalid) in ${Date.now() - start1} ms`);
    const expired = await CoinAlerts.find({coin: {$nin: validCryptos.map(meta => meta.cmc_id)}}).toArray();
    await CoinAlerts.deleteMany({coin: {$nin: validCryptos.map(meta => meta.cmc_id)}});
    const removedCoins = expired.map(alert => alert.coin);
    console.log(`Removed ${removedCoins.length} expired alerts for ${removedCoins.join(", ")}`);
    // await notifyExpiredAlerts(expired.map(alert => alert.user), expired);
    // await notifyUsers();
    processing = false;
}

export async function getLimit(coin: number) {
    const result = await Candles.findOne({coin: coin}, {sort: {open_time: -1}});
    if (!result) {
        return 1000;
    }
    return Math.min(1000, Math.ceil((Date.now() - result.open_time) / (24 * 60 * 60 * 1000)));
}

