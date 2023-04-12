import got from "got";
import InteractionProcessor from "../ui/abstractInteractionProcessor";
import {APIUser} from "discord-api-types/v10";
import {Indexable} from "./utils";

/**key=command name */
export const interactionProcessors = new Map<string, InteractionProcessor>();
export let client: APIUser;
export const commandIds = new Map<string, string>();
export let startTime = Infinity;
export const commands = new Map<string, any>();
export const discordGot = got.extend({
    headers: {
        "User-Agent": "DiscordBot (http, 1.0)",
        "Authorization": "Bot " + process.env["BOT_TOKEN"],
        "Content-Type": "application/json"
    },
    prefixUrl: "https://discord.com/api/v10",
    timeout: {
        lookup: 1000,
        connect: 1000,
        secureConnect: 1000,
        socket: 1000,
        send: 10000,
        response: 1000
    }
});
const customIdVersions = {
    coinalert_alertstat: "0.0.1",
    coinalert_alertvalue: "0.0.1",
    coinalert_alertthresholdmodal: "0.0.1",
    coinalert_alertthresholdmodalvalue: "0.0.1",
    coinalert_alertdirectiongreater: "0.0.1",
    coinalert_alertdirectionless: "0.0.1",
    coinalert_confirm: "0.0.1",
    coinalert_confirmundo: "0.0.1",
    coinalert_alertvalueundo: "0.0.1",
    coinalert_alertdirectionundo: "0.0.1",
    coin_refresh: "0.0.1",
    myalerts_menu: "0.0.2",
    myalerts_enable: "0.0.2",
    myalerts_disable: "0.0.2",
    myalerts_delete: "0.0.2",
    myalerts_refresh: "0.0.2"
} as Indexable;

export function initClient(input: APIUser) {
    client = input;
    startTime = Date.now();
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
        return undefined;
    }
    if (latest == major + "." + minor + "." + patch) {
        return id.substring(id.indexOf(key));
    }
    return undefined;
}

function patchCustomId(id: string) {
    const key = id.split("_")[0] + "_" + id.split("_")[1];
    const latest = customIdVersions[key];
    if (!latest) {
        return undefined;
    }
    return latest + "_" + id;
}

export function deepPatchCustomId(obj: any) {
    if (obj == undefined) {
        return;
    }
    for (const key of Object.keys(obj)) {
        if (key == "custom_id") {
            obj[key] = patchCustomId(obj[key]);
        }
        if (obj[key] instanceof Object) {
            deepPatchCustomId(obj[key]);
        }
    }
}

export function deepValidateCustomId(obj: any) {
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
            if (!deepValidateCustomId(obj[key])) {
                return false;
            }
        }
    }
    return true;
}