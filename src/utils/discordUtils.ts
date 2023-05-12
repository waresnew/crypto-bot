import got from "got";
import InteractionProcessor from "../ui/abstractInteractionProcessor";
import {APIApplicationCommand, APIInteraction, APIUser} from "discord-api-types/v10";
import {Indexable} from "./utils";
import {analytics} from "./analytics";
import {UserError} from "../structs/userError";
import {UserDatas} from "./database";

/**key=command name */
export const interactionProcessors = new Map<string, InteractionProcessor>();
export let client: APIUser;
export const commandIds = new Map<string, string>();
export let startTime = Infinity;
export const commands = new Map<string, APIApplicationCommand>();
export const emojis = {
    "bullish": "<:bullish:1097137805546758184>",
    "bearish": "<:bearish:1097137994932178985>"
};
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
//only two tokens allowed
export const customIdVersions = {
    coinalert_stat: "0.0.1",
    coinalert_value: "0.0.1",
    coinalert_thresholdmodal: "0.0.1",
    coinalert_thresholdmodalvalue: "0.0.1",
    coinalert_greater: "0.0.1",
    coinalert_less: "0.0.1",
    coinalert_confirm: "0.0.1",
    coinalert_confirmundo: "0.0.1",
    coinalert_valueundo: "0.0.1",
    coinalert_directionundo: "0.0.1",
    coin_refresh: "0.0.1",
    myalerts_menu: "0.0.2",
    myalerts_enable: "0.0.2",
    myalerts_disable: "0.0.2",
    myalerts_delete: "0.0.2",
    myalerts_refresh: "0.0.2",
    gas_refresh: "0.0.1",
    gasalert_speedslow: "0.0.1",
    gasalert_speednormal: "0.0.1",
    gasalert_speedfast: "0.0.1",
    gasalert_thresholdundo: "0.0.1",
    gasalert_confirmundo: "0.0.1",
    gasalert_threshold: "0.0.1",
    gasalert_thresholdmodal: "0.0.1",
    gasalert_thresholdmodalvalue: "0.0.1",
    gasalert_confirm: "0.0.1",
    indicators_refresh: "0.0.1",
    patterns_refresh: "0.0.1",
    pivots_refresh: "0.0.1",
    serversettings_alertManagerRole: "0.0.1",
    coinalert_guild: "0.0.1",
    coinalert_dm: "0.0.1",
    coinalert_statundo: "0.0.1",
    coinalert_channel: "0.0.1",
    coinalert_channelundo: "0.0.1",
    coinalert_role: "0.0.1",
    coinalert_roleundo: "0.0.1",
    coinalert_roleskip: "0.0.1",
    coinalert_msg: "0.0.1",
    coinalert_msgmodalvalue: "0.0.1",
    coinalert_msgmodal: "0.0.1"
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
        throw new Error("customid version not found: " + key);
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

export async function userNotVotedRecently(id: string) {
    const user = await UserDatas.findOne({user: id});
    return !user || !user.lastVoted || user.lastVoted < Date.now() - (1000 * 60 * 60 * 12 + 1000 * 60 * 5);
}

export function validateRefresh(interaction: APIInteraction, latest: number, interval = 65) {
    const latestTime = Math.floor(latest / 1000);
    const curTime = Number(interaction.message.embeds[0].fields.find(field => field.name === "Last Updated").value.replaceAll("<t:", "").replaceAll(":R>", ""));
    if (Math.abs(latestTime - curTime) < 1) {
        analytics.track({
            userId: interaction.user.id,
            event: "Tried to refresh something that was already up to date"
        });
        throw new UserError("This panel has not been updated since the last time you refreshed it.\nPlease try again <t:" + (curTime + interval) + ":R>.");
    }
}
