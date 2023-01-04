import { CronJob } from "cron";
import { WebhookClient } from "discord.js";
import fetch from "node-fetch";
import { db } from "../database.js";
import { cryptoSymbolList } from "../commands/coin.js";
new CronJob("*/5 * * * *", async () => {
    const request = await fetch("https://pro-api.coinmarketcap.com/v1/cryptocurrency/listings/latest?" +
        new URLSearchParams({
            limit: "200"
        }), {
        method: "get",
        headers: {
            "X-CMC_PRO_API_KEY": process.env["COINMARKETCAP_KEY"],
            Accept: "application/json",
            "Accept-Encoding": "deflate, gzip",
            "Content-Type": "application/json"
        }
    });
    const json = JSON.parse(await request.text());
    const errorCode = json.status.error_code;
    if (errorCode != 0) {
        new WebhookClient({ url: process.env["LOG_WEBHOOK"] }).send(`Error code ${errorCode} from the CoinMarketCap API occured at ${json.status.timestamp}`);
    }
    await db.run("begin");
    await db.run("delete from cmc_cache");
    await db.run("delete from quote_cache");
    cryptoSymbolList.length = 0;
    for (let i = 0; i < 200; i++) {
        const data = json.data[i];
        const quote = json.data[i].quote.USD;
        cryptoSymbolList.push(data.symbol.toLowerCase());
        data.rowid = null;
        genSqlInsertCommand(data, "insert into cmc_cache values(", new CryptoApiData());
        quote.reference = (await db.get("select rowid from cmc_cache where rowid=last_insert_rowid()")).rowid;
        data.rowid = quote.reference;
        genSqlInsertCommand(quote, "insert into quote_cache values(", new CryptoQuote());
    }
    await db.run("commit");
    console.log(`Updated caches at ${new Date().toString()}`);
}, null, true, "America/Toronto");
function genSqlInsertCommand(data, start, dummy) {
    const keys = Object.keys(data).sort();
    const dummyKeys = Object.keys(dummy).sort();
    let ans = start;
    let firstEntry = true;
    const params = [];
    for (let i = 0; i < keys.length; i++) {
        if (!dummyKeys.includes(keys[i])) {
            continue;
        }
        ans += !firstEntry ? ", ?" : "?";
        firstEntry = false;
        params.push(data[keys[i]]);
    }
    db.run(ans + ")", params);
}
export class CryptoApiData {
    cmc_rank = 0;
    id = 0;
    last_updated = "ERROR";
    name = "ERROR";
    rowid = 0;
    slug = "ERROR";
    symbol = "ERROR";
}
export class CryptoQuote {
    fully_diluted_market_cap = 0;
    last_updated = "ERROR";
    market_cap = 0;
    market_cap_dominance = 0;
    percent_change_1h = 0;
    percent_change_24h = 0;
    percent_change_7d = 0;
    price = 0;
    reference = 0;
    volume_24h = 0;
    volume_change_24h = 0;
}
//# sourceMappingURL=cmcApi.js.map