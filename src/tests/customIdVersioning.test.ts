import {deepVersionCustomId, validateCustomIdVer} from "../utils";

describe("Test customid versioning", () => {
    it("throws if customid doesn't exist", () => {
        try {
            validateCustomIdVer("0.0.1_coin_alerstsmodal");
        } catch (e) {
            expect(e).toBe("coin_alerstsmodal is not a valid customid key");
        }
    });
    it("returns undefined if customid version is not latest", () => {
        expect(validateCustomIdVer("0.0.2_coin_alertsmodal_1")).toBeUndefined();
        expect(validateCustomIdVer("0.0.0_coin_alertsmodal_1")).toBeUndefined();
        expect(validateCustomIdVer("0.0.1_coin_alertsmodal_1")).not.toBeUndefined();
        expect(validateCustomIdVer("0.0.1_coin_alertsmodal_1")).toBe("coin_alertsmodal_1");
    });

    it("prefixes version of deep object correctly", () => {
        const obj = {
            custom_id: "coin_alertsmodal_1",
            a: {
                custom_id: "coin_alertsmodalstat_1234567890"
            },
            b: [
                {
                    custom_id: "coin_alertsmodalstat_1234567890"
                }
            ]
        };
        deepVersionCustomId(obj);
        expect(obj.custom_id).toBe("0.0.1_coin_alertsmodal_1");
        expect(obj.a.custom_id).toBe("0.0.1_coin_alertsmodalstat_1234567890");
        expect(obj.b[0].custom_id).toBe("0.0.1_coin_alertsmodalstat_1234567890");
    });
});