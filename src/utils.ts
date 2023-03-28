import InteractionProcessor from "./ui/abstractInteractionProcessor";
import {
    APIApplicationCommandAutocompleteInteraction,
    APIUser,
    ApplicationCommandOptionType,
    InteractionResponseType
} from "discord-api-types/v10";
import got from "got";
import {
    APIApplicationCommandInteractionDataStringOption
} from "discord-api-types/payloads/v10/_interactions/_applicationCommands/_chatInput/string";
import {CmcLatestListingModel} from "./structs/cmcLatestListing";
import didyoumean from "didyoumean";
import {
    APIChatInputApplicationCommandInteraction
} from "discord-api-types/payloads/v10/_interactions/_applicationCommands/chatInput";

//avoiding circular dependencies
export const cryptoSymbolList: string[] = [];
export const cryptoNameList: string[] = [];
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
        lookup: 100,
        connect: 50,
        secureConnect: 50,
        socket: 1000,
        send: 10000,
        response: 1000
    },
    retry: {
        limit: 3,
        methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
        statusCodes: [
            429,
            500,
            502,
            503,
            504,
            521,
            522,
            524
        ]
    }
});
const customIdVersions = {
    track_alertstat: "0.0.1",
    track_alertvalue: "0.0.1",
    track_alertthresholdmodal: "0.0.1",
    track_alertthresholdmodalvalue: "0.0.1",
    track_alertdirectiongreater: "0.0.1",
    track_alertdirectionless: "0.0.1",
    track_confirm: "0.0.1",
    track_confirmundo: "0.0.1",
    track_alertvalueundo: "0.0.1",
    track_alertdirectionundo: "0.0.1",
    coin_refresh: "0.0.1",
    alerts_menu: "0.0.1",
    alerts_enable: "0.0.1",
    alerts_disable: "0.0.1",
    alerts_delete: "0.0.1",
    alerts_refresh: "0.0.1"
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
    [index: string]: any;
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

function patchCustomId(id: string, user: string) {
    const key = id.split("_")[0] + "_" + id.split("_")[1];
    const latest = customIdVersions[key];
    if (!latest) {
        return undefined;
    }
    return latest + "_" + id + "_" + user;
}

export function deepPatchCustomId(obj: any, user: string) {
    if (obj == undefined) {
        return;
    }
    for (const key of Object.keys(obj)) {
        if (key == "custom_id") {
            obj[key] = patchCustomId(obj[key], user);
        }
        if (obj[key] instanceof Object) {
            deepPatchCustomId(obj[key], user);
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
export function autocompleteCoins(interaction: APIApplicationCommandAutocompleteInteraction) {
    const focusedValue = (interaction.data.options.find(option => option.type == ApplicationCommandOptionType.String && option.focused) as APIApplicationCommandInteractionDataStringOption).value.toLowerCase();
    const filtered = cryptoSymbolList.filter(choice => choice.toLowerCase().startsWith(focusedValue));
    filtered.length = Math.min(filtered.length, 25);
    return {
        type: InteractionResponseType.ApplicationCommandAutocompleteResult,
        data: {choices: filtered.map(choice => ({name: choice, value: choice}))}
    };
}

/* istanbul ignore next */
export async function parseCoinCommandArg(interaction: APIChatInputApplicationCommandInteraction) {
    const input = interaction.data.options?.find(option => option.name == "name");
    let coin: string;
    if (!input) {
        coin = "btc";
    } else {
        coin = (input as APIApplicationCommandInteractionDataStringOption).value;
    }
    const choice = await CmcLatestListingModel.findOne({$or: [{symbol: coin}, {name: coin}]}).collation({
        locale: "en",
        strength: 2
    });
    if (!choice) {
        const suggestion = didyoumean(coin.toLowerCase(), cryptoSymbolList.concat(cryptoNameList));
        throw `Couldn't find a coin called \`${coin}\`. ${suggestion != null
            ? `Did you mean </coin:${interaction.data.id}> \`${suggestion}\`?`
            : ""
        }`;
    }
    return choice;
}