import CryptoStat from "../src/structs/cryptoStat";

describe("Test conversions", () => {
    test("1", () => {
        expect(CryptoStat.shortToLong("price")).toBe("price");
    });

    test("2", () => {
        expect(CryptoStat.shortToLong("1h%")).toBe("1 hour price change percentage");
    });
});
