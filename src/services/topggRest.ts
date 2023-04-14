import {CronJob} from "cron";
import got from "got";

export const postServerCountCron = new CronJob(
    "0 0 * * *",
    postServerCount,
    null,
    false,
    "UTC"
);

export async function postServerCount() {
    await got(`https://top.gg/api/bots/${process.env["APP_ID"]}/stats`, {
        method: "POST",
        headers: {
            "Authorization": process.env["TOPGG_TOKEN"]
        }
    });
}