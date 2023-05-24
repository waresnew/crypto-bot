import {validateRefresh} from "../src/utils/discordUtils";
import {UserError} from "../src/structs/userError";

describe("Tests refresh cooldowns", () => {
    it("should reject refresh if cooldown is active", () => {
        try {
            validateRefresh({
                message: {
                    embeds: [{
                        fields: [{
                            name: "Last Updated",
                            value: "<t:1629780000:R>"
                        }]
                    }]
                },
                user: {
                    id: "123"
                }
            } as any, 1629780000000);
            fail();
        } catch (e) {
            if (!(e instanceof UserError)) {
                throw e;
            }
            expect((e as UserError).error).toMatch("This panel has not been updated since the last time you refreshed it");
        }
    });
    it("should accept refresh if cooldown is not active", () => {
        validateRefresh({
            message: {
                embeds: [{
                    fields: [{
                        name: "Last Updated",
                        value: "<t:1629780000:R>"
                    }]
                }]
            },
            user: {
                id: "123"
            }
        } as any, 1629780065000);
    });
});