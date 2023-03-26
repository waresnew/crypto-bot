import nock from "nock";
import got from "got";

describe("Test nock", () => {
    it("mocks the request only once", async () => {
        nock("https://google.com")
            .get("/")
            .reply(200, "ok");
        expect(await got("https://google.com").text()).toBe("ok");
        await expect(got("https://google.com")).rejects.toThrow();
    });
    it("allows chaining once()", async () => {
        nock("https://google.com")
            .get("/")
            .reply(200, "1")
            .get("/")
            .reply(200, "2");
        expect(await got("https://google.com").text()).toBe("1");
        expect(await got("https://google.com").text()).toBe("2");
        await expect(got("https://google.com")).rejects.toThrow();
    });
    it("allows mocking errors", async () => {
        nock("https://google.com")
            .get("/")
            .reply(404, "no");

        try {
            await got("https://google.com");
            fail("should have thrown");
        } catch (e: any) {
            expect(e.response.statusCode).toBe(404);
            expect(e.response.body).toBe("no");
        }

    });
    it("allows mocking headers", async () => {
        nock("https://google.com")
            .get("/")
            .reply(200, "ok", {"Content-Type": "application/json"});
        const resp = await got("https://google.com");
        expect(resp.headers["content-type"]).toBe("application/json");
        expect(resp.body).toBe("ok");
    });
});
