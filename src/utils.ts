import InteractionProcessor from "./ui/abstractInteractionProcessor";
import {APIUser} from "discord-api-types/v10";

//avoiding circular dependencies
export const cryptoSymbolList: string[] = [];
export const cryptoNameList: string[] = [];
/**key=command name */
export const interactionProcessors = new Map<string, InteractionProcessor>();
export let client: APIUser;
export const commandIds = new Map<string, string>();
export let startTime = Infinity;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const commands = new Map<string, any>();

export function initClient(input: APIUser) {
    client = input;
    startTime = Date.now();
}

/** only accepts <1*/
export function scientificNotationToNumber(input: string): string {
    const tokens = input.split("e");
    const left = tokens[0].indexOf(".");
    let ans = "0.";
    for (let i = 0; i < Math.abs(Number(tokens[1])) - left; i++) {
        ans += "0";
    }
    ans += tokens[0].replace(".", "");
    return ans;
}

export interface Indexable {
// eslint-disable-next-line @typescript-eslint/no-explicit-any
    [index: string]: any;
}

