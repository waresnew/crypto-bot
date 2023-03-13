import {getCmcKey} from "../services/cmcApi";
import {getCmcCache} from "../database";
import {CryptoApiData} from "../structs/cryptoapidata";

describe("Tests cmcApi functions", () => {
    it("rotates keys", () => {
        process.env["COINMARKETCAP_KEY1"] = "key1";
        process.env["COINMARKETCAP_KEY2"] = "key2";
        process.env["COINMARKETCAP_KEY3"] = "key3";
        process.env["COINMARKETCAP_KEY4"] = "key4";
        process.env["COINMARKETCAP_KEY5"] = "key5";
        expect(getCmcKey()).toBe("key2"); //bc setup calls updatecmc() once which increments key
        expect(getCmcKey()).toBe("key3");
        expect(getCmcKey()).toBe("key4");
        expect(getCmcKey()).toBe("key5");
        expect(getCmcKey()).toBe("key1");
        expect(getCmcKey()).toBe("key2");
    });
    it("uses the current last updated stat", async () => {
        expect(((await getCmcCache("select * from cmc_cache where symbol = 'BTC'")) as CryptoApiData).last_updated).toBe("2018-06-02T22:51:28.209Z");
    });
});