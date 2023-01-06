import {CronJob} from "cron";
import {WebhookClient} from "discord.js";
import fetch from "node-fetch";
import {db, genSqlInsertCommand} from "../database.js";
import {cryptoSymbolList} from "../globals.js";
import {CryptoApiData} from "../structs/cryptoapidata.js";

export async function initApiCrons() {
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
                await new WebhookClient({url: process.env["LOG_WEBHOOK"]}).send(`Error code ${errorCode} from the CoinMarketCap API occured at ${json.status.timestamp}`);
            }
            await db.run("begin");
            await db.run("delete from cmc_cache");
            cryptoSymbolList.length = 0;
            for (let i = 0; i < 200; i++) {
                const data = {...json.data[i], ...json.data[i]["quote"]["USD"]} as CryptoApiData;
                cryptoSymbolList.push(data.symbol);
                await genSqlInsertCommand(data, "cmc_cache", new CryptoApiData());
            }
            await db.run("commit");
            console.log(`Updated caches at ${new Date().toString()}`);
        },
        null,
        true,
        "America/Toronto"
    );
}

