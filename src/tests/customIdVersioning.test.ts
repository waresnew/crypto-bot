import {customIdVersions, deepPatchCustomId, deepValidateCustomId} from "../utils/discordUtils";

describe("Test customid versioning", () => {
    it("throws if customid doesn't exist", () => {
        try {
            deepPatchCustomId({ok: "0.0.1_coin_alerstsmodal"});
        } catch (e) {
            expect(e).toBe("coin_alerstsmodal is not a valid customid key");
        }
    });
    it("validates version correctly", () => {
        const obj = {
            custom_id: `${customIdVersions["myalerts_menu"]}_myalerts_menu`,
            a: {
                custom_id: `${customIdVersions["myalerts_enable"]}_myalerts_enable`
            },
            b: [
                {
                    custom_id: `${customIdVersions["myalerts_disable"]}_myalerts_disable`
                }
            ]
        };
        expect(deepValidateCustomId(obj)).toBe(true);
        expect(obj.custom_id).toBe("myalerts_menu");
        expect(obj.a.custom_id).toBe("myalerts_enable");
        expect(obj.b[0].custom_id).toBe("myalerts_disable");
        const obj2 = {
            custom_id: "0.0.0_myalerts_menu_1",
            b: [
                {
                    custom_id: "0.0.0_myalerts_enable"
                }
            ]
        };
        expect(deepValidateCustomId(obj2)).toBe(false);
    });

    it("prefixes version of deep object correctly", () => {
        const obj = {
            custom_id: "myalerts_menu",
            a: {
                custom_id: "myalerts_enable"
            },
            b: [
                {
                    custom_id: "myalerts_disable"
                }
            ]
        };
        deepPatchCustomId(obj);
        expect(obj.custom_id).toBe(`${customIdVersions["myalerts_menu"]}_myalerts_menu`);
        expect(obj.a.custom_id).toBe(`${customIdVersions["myalerts_enable"]}_myalerts_enable`);
        expect(obj.b[0].custom_id).toBe(`${customIdVersions["myalerts_disable"]}_myalerts_disable`);
    });
});