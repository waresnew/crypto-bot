import sqlite3 from "sqlite3";
import { open, Database } from "sqlite";
import path from "node:path";
import { fileURLToPath } from "url";
import { CryptoApiData, CryptoQuote } from "./api/cmcApi.js";
import { cryptoSymbolList, cryptoNameList } from "./commands/coin.js";
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
await db.run(genSqlSchema(new CryptoApiData(), "create table if not exists cmc_cache("));
await db.run(genSqlSchema(new CryptoQuote(), "create table if not exists quote_cache("));
db.run("create index if not exists name_index on cmc_cache(name)");
db.run("create index if not exists symbol_index on cmc_cache(symbol)");
db.run("create index if not exists id_index on quote_cache(reference)");
await db.run("commit");
await db.each("select * from cmc_cache", (err, row) => {
    if (err) {
        throw err;
    }
    cryptoSymbolList.push(row.symbol);
    cryptoNameList.push(row.name);
});
/**assume fields are only type number/string */
function genSqlSchema(dummy: CryptoApiData | CryptoQuote, start: string) {
    let ans = start;
    const keys = Object.keys(dummy).sort();
    for (let i = 0; i < keys.length; i++) {
        const prop = keys[i];
        const type = typeof dummy[prop];
        let typeString: string;
        if (type == "number") {
            typeString = "double";
        } else {
            typeString = "varchar(65535)";
        }
        ans += `${i != 0 ? ", " : ""}${prop} ${prop == "rowid" ? "integer" : typeString}${prop == "rowid" ? " primary key" : ""
            }`;
    }
    return ans + ")";
}
