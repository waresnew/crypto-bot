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

export async function openDb() {
    mongoClient = await MongoClient.connect(process.env["MONGO_URL"], {
        connectTimeoutMS: 10000
    });
    await mongoClient.db("admin").command({ping: 1});
    console.log("Connected to MongoDb");
    db = mongoClient.db(`crypto-bot-${process.env["NODE_ENV"]}`);
    Candles = db.collection("candles");
    CoinAlerts = db.collection("coinalerts");
    LatestCoins = db.collection("latestcoins");
    await Candles.createIndex({coin: 1, open_time: -1}, {unique: true});
    await CoinAlerts.createIndex({coin: 1, user: 1, stat: 1, threshold: 1, direction: 1, disabled: 1}, {unique: true});
    await LatestCoins.createIndex({coin: 1}, {unique: true});

}
