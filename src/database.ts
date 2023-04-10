/* istanbul ignore file */

import {Collection, Db, MongoClient} from "mongodb";
import {Candle} from "./structs/candle";
import {CoinAlert} from "./structs/coinAlert";
import {LatestCoin} from "./structs/latestCoin";

export let db: Db = null;
export let mongoClient: MongoClient = null;
export let Candles: Collection<Candle> = null;
export let CoinAlerts: Collection<CoinAlert> = null;
export let LatestCoins: Collection<LatestCoin> = null;

export async function openDb(url: string, dbName: string) {
    mongoClient = await MongoClient.connect(url);
    console.log("Connected to MongoDb");
    db = mongoClient.db(dbName);
    Candles = db.collection("candles");
    CoinAlerts = db.collection("coinalerts");
    LatestCoins = db.collection("latestcoins");
    await Candles.createIndex({coin: 1, open_time: -1}, {unique: true});
    await CoinAlerts.createIndex({coin: 1, user: 1, stat: 1, threshold: 1, direction: 1, disabled: 1}, {unique: true});
    await LatestCoins.createIndex({coin: 1}, {unique: true});

}
