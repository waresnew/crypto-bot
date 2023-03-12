import {deepInsertCustomId, deepStripCustomId} from "../utils";

describe("Test customid versioning", () => {
    it("throws if customid doesn't exist", () => {
        try {
            deepInsertCustomId({ok: "0.0.1_coin_alerstsmodal"});
        } catch (e) {
            expect(e).toBe("coin_alerstsmodal is not a valid customid key");
        }
    });
    it("validates version correctly", () => {
        const obj = {
            custom_id: "0.0.1_coin_alertsmodal_1",
            a: {
                custom_id: "0.0.1_coin_alertsmodalstat_1234567890"
            },
            b: [
                {
                    custom_id: "0.0.1_coin_alertsmodalstat_1234567890"
                }
            ]
        };
        expect(deepStripCustomId(obj)).toBe(true);
        expect(obj.custom_id).toBe("coin_alertsmodal_1");
        expect(obj.a.custom_id).toBe("coin_alertsmodalstat_1234567890");
        expect(obj.b[0].custom_id).toBe("coin_alertsmodalstat_1234567890");
        const obj2 = {
            custom_id: "0.0.1_coin_alertsmodal_1",
            b: [
                {
                    custom_id: "0.0.2_coin_alertsmodalstat_1234567890"
                }
            ]
        };
        expect(deepStripCustomId(obj2)).toBe(false);
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
        deepInsertCustomId(obj);
        expect(obj.custom_id).toBe("0.0.1_coin_alertsmodal_1");
        expect(obj.a.custom_id).toBe("0.0.1_coin_alertsmodalstat_1234567890");
        expect(obj.b[0].custom_id).toBe("0.0.1_coin_alertsmodalstat_1234567890");
    });
});