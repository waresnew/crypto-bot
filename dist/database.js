import sqlite3 from "sqlite3";
import { open } from "sqlite";
import path from "node:path";
import { fileURLToPath } from "url";
import { CryptoApiData } from "./structs/cryptoapidata.js";
import { cryptoSymbolList, cryptoNameList } from "./globals.js";
import { UserSetting } from "./structs/usersettings.js";
export let db = null;
sqlite3.verbose();
db = await open({
    filename: path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "data", "bot.db"),
    driver: sqlite3.Database
});
await db.run("begin");
await db.run("create table if not exists global_stats(id integer primary key, commands_run_ever integer default 0, unique_user integer default 0)");
db.run("insert or ignore into global_stats(id) values(0)");
await db.run("create table if not exists cmc_cache(dummy bit)");
await genSqlSchema(new CryptoApiData(), "cmc_cache");
db.run("create index if not exists cmc_name_index on cmc_cache(name)");
db.run("create index if not exists cmc_symbol_index on cmc_cache(symbol)");
db.run("create index if not exists cmc_id_index on cmc_cache(id)");
await db.run("create table if not exists user_settings(dummy bit)");
await genSqlSchema(new UserSetting(), "user_settings");
db.run("create index if not exists settings_id_index on user_settings(id)");
db.run("create index if not exists settings_type_index on user_settings(type)");
db.run("create index if not exists alert_token_index on user_settings(alertToken)");
db.run("create index if not exists alert_stat_index on user_settings(alertStat)");
db.run("create index if not exists favCrypto_index on user_settings(favouriteCrypto)");
await db.run("commit");
await db.each("select symbol,name from cmc_cache", (err, row) => {
    if (err) {
        throw err;
    }
    cryptoSymbolList.push(row.symbol);
    cryptoNameList.push(row.name);
});
async function genSqlSchema(dummy, table) {
    const keys = Object.keys(dummy).filter(key => key != "dummy");
    for (let i = 0; i < keys.length; i++) {
        const prop = keys[i];
        const type = typeof dummy[prop];
        let typeString;
        if (type == "number") {
            typeString = "double";
        }
        else {
            typeString = "varchar(65535)";
        }
        try {
            await db.run(`alter table ${table} add ${prop} ${typeString}`);
        }
        catch (err) {
        }
    }
}
export async function genSqlInsertCommand(data, table, dummy) {
    const dummyKeys = Object.keys(dummy);
    let keyString = `insert into ${table} (`;
    let valueString = " values(";
    const valueParams = [];
    for (let i = 0; i < dummyKeys.length; i++) {
        valueString += i != 0 ? ", ?" : "?";
        keyString += i != 0 ? `, ${dummyKeys[i]}` : dummyKeys[i];
        const newData = data[dummyKeys[i]];
        valueParams.push(!newData ? dummy[dummyKeys[i]] : newData);
    }
    await db.run(keyString + ")" + valueString + ")", valueParams);
}
//# sourceMappingURL=database.js.map