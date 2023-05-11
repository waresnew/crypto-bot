/* istanbul ignore file */

import {Collection, Db, MongoClient} from "mongodb";
import {Candle} from "../structs/candle";
import {CoinAlert} from "../structs/alert/coinAlert";
import {LatestCoin} from "../structs/latestCoin";
import {GasAlert} from "../structs/alert/gasAlert";
import {UserData} from "../structs/userdata";
import {ServerSetting} from "../structs/serverSetting";

export let db: Db = null;
export let mongoClient: MongoClient = null;
export let Candles: Collection<Candle> = null;
export let CoinAlerts: Collection<CoinAlert> = null;
export let GasAlerts: Collection<GasAlert> = null;
export let LatestCoins: Collection<LatestCoin> = null;
export let UserDatas: Collection<UserData> = null;
export let ServerSettings: Collection<ServerSetting> = null;

export async function openDb(url: string, dbName: string) {
    mongoClient = await MongoClient.connect(url);
    console.log("Connected to MongoDB");
    db = mongoClient.db(dbName);
    Candles = db.collection("candles");
    CoinAlerts = db.collection("coinalerts");
    GasAlerts = db.collection("gasalerts");
    LatestCoins = db.collection("latestcoins");
    UserDatas = db.collection("userdatas");
    ServerSettings = db.collection("serversettings");
    await Candles.createIndex({coin: 1, open_time: -1}, {unique: true});
    await CoinAlerts.createIndex({coin: 1, user: 1, stat: 1, threshold: 1, direction: 1, disabled: 1});
    await CoinAlerts.createIndex({coin: 1, guild: 1, stat: 1, threshold: 1, direction: 1, disabled: 1});

    await LatestCoins.createIndex({coin: 1}, {unique: true});
    await GasAlerts.createIndex({user: 1, speed: 1, threshold: 1});
    await GasAlerts.createIndex({guild: 1, speed: 1, threshold: 1});
    await UserDatas.createIndex({user: 1}, {unique: true});
    await ServerSettings.createIndex({guild: 1}, {unique: true});
}
