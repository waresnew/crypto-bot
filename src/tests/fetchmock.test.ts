import fetchMock from "jest-fetch-mock";

fetchMock.enableMocks();

describe("Test jest-fetch-mock", () => {
    it("mocks the request only once", async () => {
        fetchMock.once("ok");
        expect(await (await fetch("https://google.com")).text()).toBe("ok");
        expect(await (await fetch("https://google.com")).text()).not.toBe("ok");
    });
    fetchMock.resetMocks();
    it("allows chaining once()", async () => {
        fetchMock.once("1");
        fetchMock.once("2");
        expect(await (await fetch("https://google.com")).text()).toBe("1");
        expect(await (await fetch("https://google.com")).text()).toBe("2");
        expect(await (await fetch("https://google.com")).text()).not.toMatch(/[12]/);
    });

    it("allows mocking status code", async () => {
        fetchMock.once("no", {status: 429});
        const resp = await fetch("https://google.com");
        expect(resp.status).toBe(429);
        expect(await resp.text()).toBe("no");
    });
});
