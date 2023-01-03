import { SlashCommandBuilder, ChatInputCommandInteraction } from "discord.js";
import { WebhookClient } from "discord.js";
import fetch from "node-fetch";
import { CryptoApiData, CryptoQuote } from "../../api/cmcApi.js";
import { db } from "../../database.js";

export default {
    data: new SlashCommandBuilder().setName("test").setDescription("Run test commands"),
    async execute(interaction: ChatInputCommandInteraction) {
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
            new WebhookClient({ url: process.env["LOG_WEBHOOK"] }).send(
                `Error code ${errorCode} from the CoinMarketCap API occured at ${json.status.timestamp}`
            );
        }
        await db.run("begin");
        await db.run("delete from cmc_cache");
        await db.run("delete from quote_cache");
        for (let i = 0; i < 200; i++) {
            const data = json.data[i] as CryptoApiData;
            const quote = json.data[i].quote.USD as CryptoQuote;
            data.rowid = null;
            genSqlInsertCommand(data, "insert into cmc_cache values(", new CryptoApiData());
            quote.reference = (await db.get("select rowid from cmc_cache where rowid=last_insert_rowid()")).rowid;
            data.rowid = quote.reference;
            genSqlInsertCommand(quote, "insert into quote_cache values(", new CryptoQuote());
        }
        await db.run("commit");
        console.log(`Updated caches at ${new Date().toString()}`);
        interaction.editReply("done");
    }
};
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
