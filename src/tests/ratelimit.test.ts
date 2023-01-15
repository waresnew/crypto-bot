import fetchMock from "jest-fetch-mock";
import discordRequest from "../requests";

fetchMock.enableMocks();

describe("ratelimit handling", () => {
    const responses = [
        {
            status: 429,
            body: JSON.stringify({
                message: "You are being rate limited.",
                retry_after: 1,
                global: false
            })
        },
        {
            status: 429,
            body: JSON.stringify({
                message: "You are being rate limited.",
                retry_after: 1,
                global: false
            })
        },
        {
            status: 200,
            body: JSON.stringify({
                message: "ok"
            })
        }
    ];
    it("retries requests after ratelimit", () => {
        responses.forEach(resp => fetchMock.once(resp.body, {status: resp.status}));
        return discordRequest("https://discord.com/api/v10/users/@me").then(async resp => {
            expect(JSON.parse(await resp.text()).message).toBe("ok");
        });
    });
    fetchMock.resetMocks();
    it("delays requests after ratelimit", () => {
        responses.forEach(resp => fetchMock.once(resp.body, {status: resp.status}));
        const start = Date.now();
        return discordRequest("https://discord.com/api/v10/users/@me").then(() => {
            expect(Date.now() - start).toBeGreaterThanOrEqual(2000);
        });
    });
});