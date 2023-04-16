import {getCmcKey} from "../src/services/binanceRest";

describe("Tests cmcApi functions", () => {
    it("rotates keys", () => {
        process.env["COINMARKETCAP_KEY1"] = "key1";
        process.env["COINMARKETCAP_KEY2"] = "key2";
        process.env["COINMARKETCAP_KEY3"] = "key3";
        process.env["COINMARKETCAP_KEY4"] = "key4";
        process.env["COINMARKETCAP_KEY5"] = "key5";
        expect(getCmcKey()).toBe("key1");
        expect(getCmcKey()).toBe("key2");
        expect(getCmcKey()).toBe("key3");
        expect(getCmcKey()).toBe("key4");
        expect(getCmcKey()).toBe("key5");
        expect(getCmcKey()).toBe("key1");
    });
});