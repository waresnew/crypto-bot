import CryptoStat from "../structs/cryptoStat.js";
describe("Test conversions", ()=>{
    test("1", ()=>{
        expect(CryptoStat.shortToLong("price")).toBe("price");
    });
    test("2", ()=>{
        expect(CryptoStat.shortToLong("1h%")).toBe("1 hour price change");
    });
    test("3", ()=>{
        expect(CryptoStat.shortToDb("volume%")).toBe("volume_24h");
    });
    test("4", ()=>{
        expect(CryptoStat.longToShort("market cap dominance")).toBe("dominance%");
    });
});

//# sourceMappingURL=cryptoStatConversions.test.js.map