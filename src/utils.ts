/* eslint-disable @typescript-eslint/no-explicit-any */
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
const customIdVersions = {
    coin_alertsmodal: "0.0.1",
    coin_alertsmodalstat: "0.0.1",
    coin_alertsmodalvalue: "0.0.1",
    coin_setfav: "0.0.1",
    coin_refresh: "0.0.1",
    coin_alerts: "0.0.1",
    coin_favCoins: "0.0.1",
    alerts_menu: "0.0.1",
    alerts_enable: "0.0.1",
    alerts_disable: "0.0.1",
    alerts_edit: "0.0.1",
    alerts_delete: "0.0.1",
    alerts_editmodal: "0.0.1",
    alerts_editmodalstat: "0.0.1",
    alerts_editmodalvalue: "0.0.1"
} as Indexable;

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

export async function streamToString(stream: ReadableStream) {
    const chunks = [];
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    for await (const chunk of stream) {
        chunks.push(Buffer.from(chunk));
    }
    return Buffer.concat(chunks).toString("utf-8");
}

/**
 * we need to version customids to prevent errors when we change the customid format
 * @param id the customid
 * @returns returns customid but without the version if successful else undefined
 * @throws error if the customid version is not in the dictionary (not supposed to happen)
 */
function validateCustomIdVer(id: string) {
    const version = id.split("_")[0].split(".");
    const major = version[0], minor = version[1], patch = version[2];
    const key = id.split("_")[1] + "_" + id.split("_")[2];
    const latest = customIdVersions[key];
    if (!latest) {
        throw `${key} is not a valid customid key`;
    }
    if (latest == major + "." + minor + "." + patch) {
        return id.substring(id.indexOf(key));
    }
    return undefined;
}

function patchCustomIdVer(id: string) {
    const key = id.split("_")[0] + "_" + id.split("_")[1];
    const latest = customIdVersions[key];
    if (!latest) {
        throw `${key} is not a valid customid key`;
    }
    return latest + "_" + id;
}

export function deepInsertCustomId(obj: any) {
    if (obj == undefined) {
        return;
    }
    for (const key of Object.keys(obj)) {
        if (key == "custom_id") {
            obj[key] = patchCustomIdVer(obj[key]);
        }
        if (obj[key] instanceof Object) {
            deepInsertCustomId(obj[key]);
        }
    }
}

export function deepStripCustomId(obj: any) {
    if (obj == undefined) {
        return true;
    }
    for (const key of Object.keys(obj)) {
        if (key == "custom_id") {
            const stripped = validateCustomIdVer(obj[key]);
            if (!stripped) {
                return false;
            }
            obj[key] = stripped;
        }
        if (obj[key] instanceof Object) {
            if (!deepStripCustomId(obj[key])) {
                return false;
            }
        }
    }
    return true;
}