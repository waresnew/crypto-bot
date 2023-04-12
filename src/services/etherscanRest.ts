/* istanbul ignore file */
import {Indexable} from "../utils/utils";
import {CronJob} from "cron";
import got from "got";
//no need to store gas in db (small ram usage)
export const gasPrices = {
    slow: Infinity,
    normal: Infinity,
    fast: Infinity
} as Indexable;

export const etherscanApiCron = new CronJob(
    "* * * * *",
    fetchGas,
    null,
    false,
    "UTC"
);
export let etherscanLastUpdated = 0;

export async function fetchGas() {
    const start = Date.now();
    const response = JSON.parse(await got(`https://api.etherscan.io/api?module=gastracker&action=gasoracle&apikey=${process.env["ETHERSCAN_KEY"]}`).text());
    gasPrices["slow"] = response.result.SafeGasPrice;
    gasPrices["normal"] = response.result.ProposeGasPrice;
    gasPrices["fast"] = response.result.FastGasPrice;
    console.log(`Fetched gas prices in ${Date.now() - start} ms`);
    etherscanLastUpdated = Date.now();
}