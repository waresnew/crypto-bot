import fetch, {Headers, RequestInit} from "node-fetch";
import {alertDevs} from "./utils.js";
import {setTimeout as sleep} from "node:timers/promises";
import {APIChannel, APIMessage} from "discord-api-types/v10.js";

let sleeping = false;
const queue: { url: string, init: RequestInit }[] = [];
const dmQueue: { userId: string, message: APIMessage }[] = [];

/**
 * post requests only
 */
export async function discordRequest(url: string, init?: RequestInit) {
    const params: RequestInit = init ? init : {};
    (params.headers as Headers).set("User-Agent", "DiscordBot (http, 1.0)");
    (params.headers as Headers).set("Authorization", "Bot " + process.env["BOT_TOKEN"]);
    const req = await fetch(url, params);
    if (req.status == 429) {
        sleeping = true;
        const retryMs = Number(req.headers.get("X-RateLimit-Reset-After")) * 1000 + 50;
        await alertDevs(`Rate limit reached, retrying after ${Math.round(retryMs / 1000)} seconds`);
        sleep(retryMs).then(() => {
            sleeping = false;
        });
    }
    return req;
}

export async function sendDm(userId: string, message: APIMessage) {
    if (sleeping) {
        dmQueue.push({userId: userId, message: message});
        return;
    }
    const channel = await discordRequest("https://discord.com/api/v10/users/@me/channels", {
        body: JSON.stringify({recipient_id: userId})
    });
    if (channel.status != 200) {
        dmQueue.push({userId: userId, message: message});
        return;
    }
    const result = await discordRequest(`https://discord.com/api/v10/channels/${(JSON.parse(await channel.text()) as APIChannel).id}/messages`, {
        body: JSON.stringify(message)
    });
    if (result.status != 200) {
        dmQueue.push({userId: userId, message: message});
        return;
    }
}

setInterval(async () => {
    if (sleeping) {
        return;
    }
    const cur = dmQueue.at(0);
    queue.splice(0);
    await sendDm(cur.userId, cur.message);
}, 50);
