import {setTimeout as sleep} from "node:timers/promises";
import {RESTRateLimit} from "discord-api-types/payloads/common";

let sleeping = false;
const jobs: { url: string, init: RequestInit, resolve: (value: Response) => void, reject: (reason?: unknown) => void }[] = [];

/**
 * automatically adds authorization,user agent,content type headers
 * @param {string} url url
 * @param {RequestInit} init headers and stuff
 * @return {Response} the response
 */
export default function discordRequest(url: string, init: RequestInit = {}): Promise<Response> {

    const headers = {
        "User-Agent": "DiscordBot (http, 1.0)",
        "Authorization": "Bot " + process.env["BOT_TOKEN"],
        "Content-Type": "application/json"
    };
    init.headers = {...headers, ...init.headers};
    return new Promise<Response>((resolve, reject) => {
        jobs.push({url: url, init: init, resolve: resolve, reject: reject});
    });
}

export const requestProcessor = setInterval(async () => {
    if (jobs.length > 0 && !sleeping) {
        const cur = jobs.shift();
        try {
            const req = await fetch(cur.url, cur.init);
            if (req.status == 429) {
                sleeping = true;
                const ratelimit = JSON.parse(await req.text()) as RESTRateLimit;
                const retryMs = ratelimit.retry_after * 1000 + 50;
                console.log(`Rate limit reached, hanging for ${(retryMs / 1000).toPrecision(2)} seconds`);
                jobs.push(cur);
                sleep(retryMs).then(() => {
                    sleeping = false;
                });
            } else if (req.ok) {
                cur.resolve(req);
            } else {
                const text = await req.text();
                cur.reject(text);
            }
        } catch (err) {
            cur.reject(err);
        }
    }
}, 50);

