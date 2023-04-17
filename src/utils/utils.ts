import {CronJob} from "cron";
import {binanceApiCron, cleanBinanceCacheCron} from "../services/binanceRest";
import {postServerCountCron} from "../services/topggRest";
import {etherscanApiCron} from "../services/etherscanRest";

export const cronManager = new CronJob("* * * * *",
    keepCronsAlive,
    null,
    false,
    "UTC");

function keepCronsAlive() {
    if (!binanceApiCron.running) {
        binanceApiCron.start();
    }
    if (!postServerCountCron.running) {
        postServerCountCron.start();
    }
    if (!cleanBinanceCacheCron.running) {
        cleanBinanceCacheCron.start();
    }
    if (!etherscanApiCron.running) {
        etherscanApiCron.start();
    }
}

export function scientificNotationToNumber(input: string): string {
    const tokens = input.split("e");
    if (tokens.length == 1) {
        return input;
    }
    if (Number(input) >= 1) {
        return input;
    }
    const left = tokens[0].indexOf(".");
    let ans = "0.";
    for (let i = 0; i < Math.abs(Number(tokens[1])) - left; i++) {
        ans += "0";
    }
    ans += tokens[0].replace(".", "");
    return ans;
}

export function validateWhen(when: string) {
    if (!when) {
        throw "Error: You did not specify a threshold. Please try again.";
    }
    if (when.length > 10) {
        throw "Error: The threshold you specified was too long. Please note that we only support thresholds from negative one billion to positive one billion.";
    }
    if (isNaN(Number(when)) || isNaN(parseFloat(when))) {
        throw "Error: The specified threshold was not a number.";
    }
    if (Math.abs(Number(when)) > 1000000000) {
        throw "Error: The threshold you specified was too high. Please ensure it is between negative one billion and positive one billion.";
    }
}

export interface Indexable {
    [index: string]: any;
}