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
import didyoumean from "didyoumean";
import {
    APIChatInputApplicationCommandInteraction
} from "discord-api-types/payloads/v10/_interactions/_applicationCommands/chatInput";
import {CoinMetadata} from "./structs/coinMetadata";
import {Candles} from "./database";
//avoiding circular dependencies
export const validCryptos: CoinMetadata[] = [];
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

export function scientificNotationToNumber(input: string): string {
    const tokens = input.split("e");
    if (tokens.length == 1) {
        return input;
    }
    if (Number(input) >= 1) {
        return input;
    }
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

/* istanbul ignore next */
export function autocompleteCoins(interaction: APIApplicationCommandAutocompleteInteraction) {
    const focusedValue = (interaction.data.options.find(option => option.type == ApplicationCommandOptionType.String && option.focused) as APIApplicationCommandInteractionDataStringOption).value.toLowerCase();
    const filtered = validCryptos.map(meta => meta.symbol).filter(choice => choice.toLowerCase().startsWith(focusedValue));
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
    const choice = validCryptos.find(meta => meta.symbol.toLowerCase() == coin.toLowerCase() || meta.name.toLowerCase() == coin.toLowerCase());
    if (!choice) {
        const suggestion = didyoumean(coin.toLowerCase(), validCryptos.map(meta => meta.symbol).concat(validCryptos.map(meta => meta.name)));
        throw `Couldn't find a coin called \`${coin}\`. ${suggestion != null
            ? `Did you mean \`${suggestion}\`?`
            : ""
        }`;
    }
    return choice;
}

export async function getLatestCandle(coin: number) {
    return await Candles.findOne({coin: coin}, {sort: {open_time: -1}});
}