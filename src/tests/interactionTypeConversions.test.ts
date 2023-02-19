/* eslint-disable @typescript-eslint/ban-ts-comment */
import {InteractionType} from "discord-api-types/v10";

describe("Test InteractionType conversions", () => {
    test("1", () => {
        // @ts-ignore
        expect(Object.keys(InteractionType).find(key => InteractionType[key] == 1)).toBe("Ping");
    });

    test("2", () => {
        // @ts-ignore
        expect(Object.keys(InteractionType).find(key => InteractionType[key] == 2)).toBe("ApplicationCommand");
    });

    test("3", () => {
        // @ts-ignore
        expect(Object.keys(InteractionType).find(key => InteractionType[key] == 3)).toBe("MessageComponent");
    });

    test("4", () => {
        // @ts-ignore
        expect(Object.keys(InteractionType).find(key => InteractionType[key] == 4)).toBe("ApplicationCommandAutocomplete");
    });
    test("5", () => {
        // @ts-ignore
        expect(Object.keys(InteractionType).find(key => InteractionType[key] == 5)).toBe("ModalSubmit");
    });
});