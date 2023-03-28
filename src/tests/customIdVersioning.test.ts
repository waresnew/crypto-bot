import {deepPatchCustomId, deepValidateCustomId} from "../utils";

describe("Test customid versioning", () => {
    it("throws if customid doesn't exist", () => {
        try {
            deepPatchCustomId({ok: "0.0.1_coin_alerstsmodal"}, "123");
        } catch (e) {
            expect(e).toBe("coin_alerstsmodal is not a valid customid key");
        }
    });
    it("validates version correctly", () => {
        const obj = {
            custom_id: "0.0.1_alerts_menu",
            a: {
                custom_id: "0.0.1_alerts_enable_1234567890"
            },
            b: [
                {
                    custom_id: "0.0.1_alerts_disable_1234567890"
                }
            ]
        };
        expect(deepValidateCustomId(obj)).toBe(true);
        expect(obj.custom_id).toBe("alerts_menu");
        expect(obj.a.custom_id).toBe("alerts_enable_1234567890");
        expect(obj.b[0].custom_id).toBe("alerts_disable_1234567890");
        const obj2 = {
            custom_id: "0.0.1_alerts_menu_1",
            b: [
                {
                    custom_id: "0.0.2_alerts_enable_1234567890"
                }
            ]
        };
        expect(deepValidateCustomId(obj2)).toBe(false);
    });

    it("prefixes version of deep object correctly", () => {
        const obj = {
            custom_id: "alerts_menu",
            a: {
                custom_id: "alerts_enable"
            },
            b: [
                {
                    custom_id: "alerts_disable"
                }
            ]
        };
        deepPatchCustomId(obj, "123");
        expect(obj.custom_id).toBe("0.0.1_alerts_menu_123");
        expect(obj.a.custom_id).toBe("0.0.1_alerts_enable_123");
        expect(obj.b[0].custom_id).toBe("0.0.1_alerts_disable_123");
    });
});