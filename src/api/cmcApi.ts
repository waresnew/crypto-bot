import { CronJob } from "cron";
import { WebhookClient } from "discord.js";
import fetch from "node-fetch";
import { db } from "../database.js";
import { cryptoSymbolList } from "../commands/coin.js";

new CronJob(
    "*/5 * * * *",
    async () => {
        const request = await fetch(
            "https://pro-api.coinmarketcap.com/v1/cryptocurrency/listings/latest?" +
            new URLSearchParams({
                limit: "200"
            }),
            {
                method: "get",
                headers: {
                    "X-CMC_PRO_API_KEY": process.env["COINMARKETCAP_KEY"],
                    Accept: "application/json",
                    "Accept-Encoding": "deflate, gzip",
                    "Content-Type": "application/json"
                }
            }
        );
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
            const data = json.data[i] as CryptoApiData;
            const quote = json.data[i].quote.USD as CryptoQuote;
            cryptoSymbolList.push(data.symbol.toLowerCase());
            data.rowid = null;
            genSqlInsertCommand(data, "insert into cmc_cache values(", new CryptoApiData());
            quote.reference = (await db.get("select rowid from cmc_cache where rowid=last_insert_rowid()")).rowid;
            data.rowid = quote.reference;
            genSqlInsertCommand(quote, "insert into quote_cache values(", new CryptoQuote());
        }
        await db.run("commit");
        console.log(`Updated caches at ${new Date().toString()}`);
    },
    null,
    true,
    "America/Toronto"
);

function genSqlInsertCommand(data: CryptoApiData | CryptoQuote, start: string, dummy: CryptoApiData | CryptoQuote) {
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

/**
 * Wrapper for https://pro-api.coinmarketcap.com/v1/cryptocurrency/listings/latest endpoint
 */
export class CryptoApiData {
    [index: string]: string | number | CryptoQuote;
    /**The cryptocurrency's CoinMarketCap rank by market cap. */
    cmc_rank = 0;
    /**The unique CoinMarketCap ID for this cryptocurrency.*/
    id = 0;
    /**Timestamp (ISO 8601) of the last time this cryptocurrency's market data was updated. */
    last_updated = "ERROR";
    /**The name of this cryptocurrency.*/
    name = "ERROR";
    /**uid primary key (this is also the rowid)*/
    rowid = 0;
    /**web friendly name */
    slug = "ERROR";
    /**The ticker symbol for this cryptocurrency.*/
    symbol = "ERROR";
}

export class CryptoQuote {
    [index: string]: string | number;
    /**Fully diluted market cap in the specified currency. */
    fully_diluted_market_cap = 0;
    /**Timestamp (ISO 8601) of when the conversion currency's current value was referenced. */
    last_updated = "ERROR";
    /**Market cap in the specified currency. */
    market_cap = 0;
    /**Market cap dominance in the specified currency. */
    market_cap_dominance = 0;
    /**1 hour change in the specified currency. */
    percent_change_1h = 0;
    /**24 hour change in the specified currency. */
    percent_change_24h = 0;
    /**7 day change in the specified currency. */
    percent_change_7d = 0;
    /**Price in the specified currency for this historical. */
    price = 0;
    /**rowid of the matching coin (required)*/
    reference = 0;
    /**Rolling 24 hour adjusted volume in the specified currency. */
    volume_24h = 0;
    /**24 hour change in the specified currencies volume. */
    volume_change_24h = 0;
}
