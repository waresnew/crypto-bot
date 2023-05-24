/* istanbul ignore file */
import {CoinMetadata} from "../structs/coinMetadata";
import {Candles} from "./database";
import {
    APIApplicationCommandAutocompleteInteraction,
    ApplicationCommandOptionType,
    InteractionResponseType
} from "discord-api-types/v10";
import {
    APIApplicationCommandInteractionDataStringOption
} from "discord-api-types/payloads/v10/_interactions/_applicationCommands/_chatInput/string";
import {
    APIChatInputApplicationCommandInteraction
} from "discord-api-types/payloads/v10/_interactions/_applicationCommands/chatInput";
import didyoumean from "didyoumean";
import {UserError} from "../structs/userError";

export const validCryptos: CoinMetadata[] = [];

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
        throw new UserError(`Couldn't find a coin called \`${coin}\`. ${suggestion != null
            ? `Did you mean \`${suggestion}\`?`
            : ""
        }`);
    }
    return choice;
}

export async function getLatestCandle(coin: number) {
    return await Candles.findOne({coin: coin}, {sort: {open_time: -1}});
}

export function getBinanceRestUrl() {
    return process.env["NODE_ENV"] == "production" ? `${process.env["SPAIN_PROXY"]}/binance` : "https://api.binance.com";
}

export function getBinanceWsUrl() {
    // noinspection HttpUrlsUsage
    return process.env["NODE_ENV"] == "production" ? `${process.env["SPAIN_PROXY"].replace("http://", "ws://")}/binancews/ws` : "wss://stream.binance.com/ws";
}