/* istanbul ignore file */

import {Collection, Db, MongoClient} from "mongodb";
import {Candle} from "../structs/candle";
import {LatestCoin} from "../structs/latestCoin";
import {UserData} from "../structs/userdata";
import {ServerSetting} from "../structs/serverSetting";
import {DmCoinAlert} from "../structs/alert/dmCoinAlert";
import {GuildCoinAlert} from "../structs/alert/guildCoinAlert";
import {DmGasAlert} from "../structs/alert/dmGasAlert";
import {GuildGasAlert} from "../structs/alert/guildGasAlert";
import {CoinMetadata} from "../structs/coinMetadata";

export let db: Db = null;
export let mongoClient: MongoClient = null;
export let Candles: Collection<Candle> = null;
export let DmCoinAlerts: Collection<DmCoinAlert> = null;
export let GuildCoinAlerts: Collection<GuildCoinAlert> = null;
export let DmGasAlerts: Collection<DmGasAlert> = null;
export let LatestCoins: Collection<LatestCoin> = null;
export let UserDatas: Collection<UserData> = null;
export let ServerSettings: Collection<ServerSetting> = null;
export let GuildGasAlerts: Collection<GuildGasAlert> = null;
export let CoinMetadatas: Collection<CoinMetadata> = null;
export const dmCoinUnique = {
    coin: 1,
    user: 1,
    stat: 1,
    threshold: 1,
    direction: 1
};

export const guildCoinUnique = {
    coin: 1,
    guild: 1,
    stat: 1,
    threshold: 1,
    direction: 1
};

export const guildGasUnique = {
    guild: 1, speed: 1, threshold: 1
};

export const dmGasUnique = {user: 1, speed: 1, threshold: 1};

export async function openDb(url: string, dbName: string) {
    mongoClient = await MongoClient.connect(url);
    console.log("Connected to MongoDB");
    db = mongoClient.db(dbName);
    CoinMetadatas = db.collection("coinmetadatas");
    Candles = db.collection("candles");
    DmCoinAlerts = db.collection("coinalerts");
    DmGasAlerts = db.collection("gasalerts");
    LatestCoins = db.collection("latestcoins");
    UserDatas = db.collection("userdatas");
    ServerSettings = db.collection("serversettings");
    GuildCoinAlerts = db.collection("guildcoinalerts");
    GuildGasAlerts = db.collection("guildgasalerts");
    await CoinMetadatas.createIndex({
        symbol: 1
    });
    await CoinMetadatas.createIndex({
        name: 1
    });
    await CoinMetadatas.createIndex({
        cmc_id: 1
    }, {unique: true});
    await Candles.createIndex({coin: 1, open_time: -1}, {unique: true});
    await DmCoinAlerts.createIndex(dmCoinUnique, {unique: true});
    await GuildCoinAlerts.createIndex(guildCoinUnique, {unique: true});
    await GuildGasAlerts.createIndex(guildGasUnique, {unique: true});
    await LatestCoins.createIndex({coin: 1}, {unique: true});
    await DmGasAlerts.createIndex(dmGasUnique, {unique: true});
    await UserDatas.createIndex({user: 1}, {unique: true});
    await ServerSettings.createIndex({guild: 1}, {unique: true});
}
