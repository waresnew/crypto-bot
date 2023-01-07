import sqlite3 from "sqlite3";
import {Database, open} from "sqlite";
import path from "node:path";
import {fileURLToPath} from "url";
import {CryptoApiData} from "./structs/cryptoapidata.js";
import {cryptoNameList, cryptoSymbolList} from "./utils.js";
import {UserSetting} from "./structs/usersettings.js";

export let db: Database = null;
sqlite3.verbose();
db = await open({
    filename: path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "data", "bot.db"),
    driver: sqlite3.Database
});
await db.run("begin");
//init global stats
await db.run(
    "create table if not exists global_stats(id integer primary key, commands_run_ever integer default 0, unique_user integer default 0)"
);
db.run("insert or ignore into global_stats(id) values(0)");

//init cmc cache
await db.run("create table if not exists cmc_cache(dummy bit)");
await genSqlSchema(new CryptoApiData(), "cmc_cache");
db.run("create index if not exists cmc_name_index on cmc_cache(name)");
db.run("create index if not exists cmc_symbol_index on cmc_cache(symbol)");
db.run("create index if not exists cmc_id_index on cmc_cache(id)");
//init user settings
await db.run("create table if not exists user_settings(dummy bit)");
await genSqlSchema(new UserSetting(), "user_settings");
db.run("create index if not exists settings_id_index on user_settings(id)");
db.run("create index if not exists settings_type_index on user_settings(type)");
await db.run("commit");
await db.each("select symbol,name from cmc_cache", (err, row) => {
    if (err) {
        throw err;
    }
    cryptoSymbolList.push(row.symbol);
    cryptoNameList.push(row.name);
});

/**assume fields are only type number/string */
async function genSqlSchema(dummy: unknown, table: string) {
    const keys = Object.keys(dummy).filter(key => key != "dummy");
    for (let i = 0; i < keys.length; i++) {
        const prop = keys[i];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const type = typeof (dummy as any)[prop];
        let typeString: string;
        if (type == "number") {
            typeString = "decimal";
        } else {
            typeString = "varchar(65535)";
        }
        try {
            await db.run(`alter table ${table} add ${prop} ${typeString}`);
        } catch (err) {
        }
    }

}

export async function genSqlInsertCommand(data: unknown, table: string, dummy: unknown) {
    const dummyKeys = Object.keys(dummy);
    let keyString = `insert into ${table} (`;
    let valueString = " values(";
    const valueParams = [];

    for (let i = 0; i < dummyKeys.length; i++) {
        valueString += i != 0 ? ", ?" : "?";
        keyString += i != 0 ? `, ${dummyKeys[i]}` : dummyKeys[i];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const newData = (data as any)[dummyKeys[i]];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        valueParams.push(!newData ? (dummy as any)[dummyKeys[i]] : newData);
    }
    await db.run(keyString + ")" + valueString + ")", valueParams);
}

