/* istanbul ignore file */
import {getEmbedTemplate} from "../templates";
import {
    APIActionRowComponent,
    APIButtonComponent,
    APIInteractionResponse,
    ButtonStyle,
    ComponentType
} from "discord-api-types/v10";
import {CoinMetadata} from "../../structs/coinMetadata";
import {Candles, LatestCoins} from "../../utils/database";
import {scientificNotationToNumber} from "../../utils/utils";
import {binanceLastUpdated} from "../../services/binanceRest";
import got from "got";
import {FormDataEncoder} from "form-data-encoder";
import {deepPatchCustomId, emojis} from "../../utils/discordUtils";

export async function makeEmbed(choice: CoinMetadata) {
    const embed = getEmbedTemplate();
    embed.thumbnail = {
        url: `https://s2.coinmarketcap.com/static/img/coins/128x128/${choice.cmc_id}.png`
    };
    embed.image = {
        url: "attachment://chart.png"
    };
    const coin = await LatestCoins.findOne({coin: choice.cmc_id});
    const latestCandle = await Candles.findOne({coin: choice.cmc_id}, {sort: {open_time: -1}});
    embed.color = coin.weekPriceChangePercent < 0 ? 0xed4245 : 0x3ba55c;
    embed.title = `${choice.name} (${choice.symbol}/USDT)`;
    embed.url = `https://coinmarketcap.com/currencies/${choice.slug}`;
    embed.fields = [{
        name: "Price",
        value: `$${formatPrice(latestCandle.close_price)} ${coin.weekPriceChangePercent < 0 ? emojis["bearish"] : emojis["bullish"]}`
    },
        {
            name: "24h High",
            value: `$${formatPrice(coin.dayHighPrice)} ${emojis["bullish"]}`,
            inline: true
        },
        {
            name: "24h Low",
            value: `$${formatPrice(coin.dayLowPrice)} ${emojis["bearish"]}`,
            inline: true
        },
        {
            name: "\u200b",
            value: "\u200b",
            inline: true
        },
        {
            name: "1h Change",
            value: `${Math.round(coin.hourPriceChangePercent * 100) / 100}% ${coin.hourPriceChangePercent < 0 ? emojis["bearish"] : emojis["bullish"]}`,
            inline: true
        },
        {
            name: "24h Change",
            value: `${Math.round(coin.dayPriceChangePercent * 100) / 100}% ${coin.dayPriceChangePercent < 0 ? emojis["bearish"] : emojis["bullish"]}`,
            inline: true
        },
        {
            name: "7d Change",
            value: `${Math.round(coin.weekPriceChangePercent * 100) / 100}% ${coin.weekPriceChangePercent < 0 ? emojis["bearish"] : emojis["bullish"]}`,
            inline: true
        },
        {
            name: "Last Updated",
            value: `<t:${Math.floor(binanceLastUpdated / 1000)}:R>`
        }
    ];
    return embed;
}

export async function makeFormData(payload: APIInteractionResponse, coin: CoinMetadata) {
    const form = new FormData();
    const chart = await makeChart(coin);
    deepPatchCustomId(payload);
    form.set("payload_json", JSON.stringify(payload));
    form.set("files[0]", new Blob([chart]), "chart.png");
    return new FormDataEncoder(form as any);
}

export function formatPrice(price: number) {
    return price < 1 ? scientificNotationToNumber(Number(price).toPrecision(4)) : Math.round(price * 100) / 100;
}

export async function makeChart(coin: CoinMetadata) {
    const candles = await Candles.find({coin: coin.cmc_id}, {sort: {open_time: -1}, limit: 60}).toArray();
    candles.sort((a, b) => a.open_time - b.open_time);
    return got(`${process.env["OFFLOAD_URL"]}/graphserver/chart`, {
        method: "POST",
        body: JSON.stringify({
            candles: candles.map(candle => [candle.open_time, candle.open_price, candle.high_price, candle.low_price, candle.close_price, candle.quote_volume])
        })
    }).buffer();
}

export function makeButtons(choice: CoinMetadata) {
    return {
        type: ComponentType.ActionRow,
        components: [
            {
                type: ComponentType.Button,
                custom_id: `coin_refresh_${choice.cmc_id}`,
                label: "Refresh",
                emoji: {
                    id: null,
                    name: "🔄"
                },
                style: ButtonStyle.Primary
            }
        ]
    } as APIActionRowComponent<APIButtonComponent>;
}
