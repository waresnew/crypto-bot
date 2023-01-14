import fetch, {Headers, RequestInit, Response} from "node-fetch";
import {setTimeout as sleep} from "node:timers/promises";
import {RESTRateLimit} from "discord-api-types/payloads/common.js";
import {alertDevs} from "./utils.js";

let sleeping = false;

export async function discordRequest(url: string, init?: RequestInit): Promise<Response> {
    while (sleeping) {
        await sleep(1000);
    }
    const params = !init ? {headers: new Headers()} : !init.headers ? {...init, ...{headers: new Headers()}} : init;
    (params.headers as Headers).set("User-Agent", "DiscordBot (http, 1.0)");
    (params.headers as Headers).set("Authorization", "Bot " + process.env["BOT_TOKEN"]);
    (params.headers as Headers).set("Content-Type", "application/json");
    const req = await fetch(url, params);
    if (req.status == 429) {
        sleeping = true;
        const ratelimit = JSON.parse(await req.text()) as RESTRateLimit;
        const retryMs = ratelimit.retry_after * 1000 + 50;
        await alertDevs(`Rate limit reached, hanging for ${Math.round(retryMs / 1000)} seconds`);
        sleep(retryMs).then(() => {
            sleeping = false;
        });
        return discordRequest(url, init);
    }
    return req;
}