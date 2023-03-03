import sqlite3 from "sqlite3";
import {Database, open} from "sqlite";
import path from "node:path";
import {fileURLToPath} from "url";
import {CryptoApiData} from "./structs/cryptoapidata";
import {cryptoNameList, cryptoSymbolList} from "./utils";
import {UserSetting} from "./structs/usersettings";

export let db: Database = null;

sqlite3.verbose();

export async function openDb() {
    db = await open({
        filename: path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "data", "bot.db"),
        driver: sqlite3.Database
    });
}

export function setDb(d: Database) {
    db = d;
}

export async function initDb() {
    await db.run("begin");
//init global stats
    await db.run(
        "create table if not exists global_stats(id integer primary key, commands_run_ever integer default 0, unique_user integer default 0)"
    );
    await db.run("insert or ignore into global_stats(id) values(0)");

//init cmc cache
    await db.run("create table if not exists cmc_cache(dummy bit)");
    await genSqlSchema(new CryptoApiData(), "cmc_cache");
    await db.run("create index if not exists cmc_name_index on cmc_cache(name)");
    await db.run("create index if not exists cmc_symbol_index on cmc_cache(symbol)");
    await db.run("create index if not exists cmc_id_index on cmc_cache(id)");
//init user settings
    await db.run("create table if not exists user_settings(dummy bit)");
    await genSqlSchema(new UserSetting(), "user_settings");
    await db.run("create index if not exists settings_id_index on user_settings(id)");
    await db.run("create index if not exists settings_type_index on user_settings(type)");
    await db.run("commit");
    await db.each("select symbol,name from cmc_cache", (err, row) => {
        if (err) {
            throw err;
        }
        cryptoSymbolList.push(row.symbol);
        cryptoNameList.push(row.name);
    });
    console.log("Database initialized");
}

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

/**
 * only for SELECTing from cmc_cache
 * @param command
 * @param binds param vars to pass into db.get()
 * @returns coin(s) if exists in cmc_cache, otherwise a placeholder coin
 */
export async function getCmcCache(command: string, ...binds: unknown[]) {
    const result = await db.get(command, binds) as CryptoApiData;
    const placeholder = new CryptoApiData();
    placeholder.name = "This coin is no longer in the top 200 coins.";
    placeholder.symbol = "N/A";
    return result ? result : placeholder;
}

export async function idToApiData(id: number | string) {
    return await getCmcCache("select * from cmc_cache where id=?", id) as CryptoApiData;
}