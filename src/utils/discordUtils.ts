import got from "got";
import InteractionProcessor from "../ui/abstractInteractionProcessor";
import {APIApplicationCommand, APIInteraction, APIRole, APIUser, PermissionFlagsBits} from "discord-api-types/v10";
import {Indexable} from "./utils";
import {analytics} from "./analytics";
import {UserError} from "../structs/userError";
import {ServerSettings, UserDatas} from "./database";

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
//for this month
export let voteCount = 0;
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
    coinalert_stat: "0.0.2",
    coinalert_value: "0.0.2",
    coinalert_thresholdmodal: "0.0.2",
    coinalert_thresholdmodalvalue: "0.0.2",
    coinalert_greater: "0.0.1",
    coinalert_less: "0.0.1",
    coinalert_confirm: "0.0.2",
    coinalert_confirmundo: "0.0.2",
    coinalert_valueundo: "0.0.2",
    coinalert_directionundo: "0.0.2",
    coin_refresh: "0.0.1",
    myalerts_menu: "0.0.2",
    myalerts_enable: "0.0.2",
    myalerts_disable: "0.0.2",
    myalerts_delete: "0.0.2",
    myalerts_refresh: "0.0.2",
    serveralerts_menu: "0.0.1",
    serveralerts_enable: "0.0.1",
    serveralerts_disable: "0.0.1",
    serveralerts_delete: "0.0.1",
    serveralerts_refresh: "0.0.1",
    gas_refresh: "0.0.1",
    gasalert_speedslow: "0.0.2",
    gasalert_speednormal: "0.0.2",
    gasalert_speedfast: "0.0.2",
    gasalert_thresholdundo: "0.0.2",
    gasalert_confirmundo: "0.0.2",
    gasalert_threshold: "0.0.2",
    gasalert_thresholdmodal: "0.0.2",
    gasalert_thresholdmodalvalue: "0.0.2",
    gasalert_confirm: "0.0.2",
    indicators_refresh: "0.0.1",
    patterns_refresh: "0.0.1",
    pivots_refresh: "0.0.1",
    serversettings_alertManagerRole: "0.0.1",
    coinalert_guild: "0.0.1",
    coinalert_dm: "0.0.1",
    coinalert_statundo: "0.0.1",
    coinalert_role: "0.0.1",
    coinalert_roleundo: "0.0.1",
    coinalert_roleskip: "0.0.1",
    coinalert_msg: "0.0.1",
    coinalert_msgmodalvalue: "0.0.1",
    coinalert_msgmodal: "0.0.1",
    gasalert_role: "0.0.1",
    gasalert_roleundo: "0.0.1",
    gasalert_roleskip: "0.0.1",
    gasalert_msg: "0.0.1",
    gasalert_msgmodalvalue: "0.0.1",
    gasalert_msgmodal: "0.0.1",
    gasalert_guild: "0.0.1",
    gasalert_dm: "0.0.1",
    gasalert_speedundo: "0.0.1"
} as Indexable;

export function initClient(input: APIUser) {
    client = input;
    startTime = Date.now();
}

export function setVoteCount(input: number) {
    voteCount = input;
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

/* istanbul ignore next */
export async function userNotVotedRecently(id: string) {
    if (voteCount > 100) {
        return false;
    }
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

/* istanbul ignore next */
export async function checkAlertCreatePerm(interaction: APIInteraction) {
    const role = await ServerSettings.findOne({guild: interaction.guild_id});
    if (!role || role.alertManagerRole === null || role && role.alertManagerRole) {
        if (!role || role.alertManagerRole === null || !interaction.member.roles.includes(role.alertManagerRole)) {
            if (BigInt(interaction.member.permissions) & PermissionFlagsBits.ManageGuild) {
                analytics.track({
                    userId: interaction.user.id,
                    event: "Attempted to use role locked cmd without role but has manage server perms"
                });
                return;
            }
            analytics.track({
                userId: interaction.user.id,
                event: "Attempted to use role locked cmd without role"
            });
            throw new UserError(`You must have the required role to do this. Set one up with </serversettings:${commandIds.get("serversettings")}>`);
        }
    }
}

/* istanbul ignore next */

/*
in the context of an interaction (uses app_permissions)
 */
export function checkChannelSendMsgPerms(interaction: APIInteraction) {
    if (!(BigInt(interaction.app_permissions) & PermissionFlagsBits.ViewChannel)) {
        analytics.track({
            userId: interaction.user.id,
            event: "Tried to create guild alert in a channel without perm",
            properties: {
                missingPerm: "ViewChannel"
            }
        });
        throw new UserError("Error: Botchain does not have permission to **view** this channel. This permission is needed to send alerts. Either set a channel override for Botchain to give it the permission, or give Botchain a role with the permission.");
    }
    if (!(BigInt(interaction.app_permissions) & PermissionFlagsBits.SendMessages)) {
        analytics.track({
            userId: interaction.user.id,
            event: "Tried to create guild alert in a channel without perm",
            properties: {
                missingPerm: "SendMessages"
            }
        });
        throw new UserError("Error: Botchain does not have permission to **send messages** in this channel. This permission is needed to send alerts. Either set a channel override for Botchain to give it the permission, or give Botchain a role with the permission.");
    }
}

/* istanbul ignore next */
export function checkCanPingRole(role: APIRole, interaction: APIInteraction) {
    if (!role.mentionable && !(BigInt(interaction.app_permissions) & PermissionFlagsBits.MentionEveryone)) {
        analytics.track({
            userId: interaction.user.id,
            event: "Tried to create guild alert with unmentionable role",
            properties: {
                role: role.id
            }
        });
        throw new UserError("Error: The role must be mentionable to be used in alerts. Either give Botchain the permission to mention everyone, or make the role mentionable.");
    }
}