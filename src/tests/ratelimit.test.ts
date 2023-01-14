import fetchMock from "jest-fetch-mock";
import {discordRequest} from "../requests.js";

fetchMock.enableMocks();
describe("ratelimit handling", () => {
    it("delays requests after ratelimit", () => {
        fetchMock.mockResponse(JSON.stringify({
            message: "You are being rate limited.",
            retry_after: 1,
            global: false
        }));
        setTimeout(() => {
            expect(fetchMock.mock.calls.length).toBe(2);
        }, 1000);
        discordRequest("https://discord.com/api/v10/users/@me");
    });
});