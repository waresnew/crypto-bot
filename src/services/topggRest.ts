import {CronJob} from "cron";
import got from "got";
import {discordGot} from "../utils/discordUtils";

export const postServerCountCron = new CronJob(
    "0 0 * * *",
    postServerCount,
    null,
    false,
    "UTC"
);

export async function postServerCount() {
    const serverCount = await JSON.parse(await discordGot("applications/@me").text()).approximate_guild_count;
    await got(`https://top.gg/api/bots/${process.env["APP_ID"]}/stats`, {
        method: "POST",
        headers: {
            "Authorization": process.env["TOPGG_TOKEN"]
        },
        body: JSON.stringify({
            server_count: serverCount
        })
    });
}