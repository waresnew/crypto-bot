import fetchMock from "jest-fetch-mock";

fetchMock.enableMocks();

describe("server", () => {
    it("handles blank request", () => {
        fetchMock.mockResponseOnce(JSON.stringify({}));

    });
});