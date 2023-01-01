import sqlite3 from "sqlite3";
import {open, Database} from "sqlite";
import path from "node:path";
export let db:Database=null;
(async () => {
    if (db == null) {
     db =await open({filename: path.join(__dirname, "..", "data", "bot.db"), driver: sqlite3.Database});
    }
})();
