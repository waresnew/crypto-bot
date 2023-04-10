import nock from "nock";
import {discordGot} from "../utils/discordUtils";

describe("ratelimit handling", () => {
    const responses = [
        {
            status: 429,
            body: JSON.stringify({
                message: "You are being rate limited.",
                retry_after: 0.5,
                global: false
            }),
            headers: {
                "Retry-After": "0.5"
            }
        },
        {
            status: 429,
            body: JSON.stringify({
                message: "You are being rate limited.",
                retry_after: 1,
                global: false
            }),
            headers: {
                "Retry-After": "1"
            }
        },
        {
            status: 200,
            body: JSON.stringify({
                message: "ok"
            })
        }
    ];
    it("retries requests after ratelimit", async () => {
        const mock = nock("https://discord.com");
        responses.forEach(resp => mock.get("/api/v10/users/@me").reply(resp.status, resp.body, resp.headers));
        const start = Date.now();
        expect(await discordGot("users/@me").text()).toBe(JSON.stringify({message: "ok"}));
        expect(Date.now() - start).toBeGreaterThanOrEqual(1500);
        expect(Date.now() - start).toBeLessThan(2000);
    });
});