import InteractionProcessor from "./ui/abstractInteractionProcessor.js";
import {APIUser} from "discord-api-types/v10.js";

//avoiding circular dependencies
export const cryptoSymbolList: string[] = [];
export const cryptoNameList: string[] = [];
/**key=command name */
export const interactionProcessors = new Map<string, InteractionProcessor>();
export let client: APIUser;
export const commandIds = new Map<string, string>();
export let startTime = Infinity;

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

export async function alertDevs(message: string) {
    await fetch(process.env["LOG_WEBHOOK"], {
        method: "post",
        body: `content: ${message}`,
        headers: {
            "User-Agent": "DiscordBot (http, 1.0)"
        }
    });
}

