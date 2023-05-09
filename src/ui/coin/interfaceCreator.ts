/* istanbul ignore file */
import {getEmbedTemplate} from "../templates";
import {
    APIActionRowComponent,
    APIButtonComponent,
    APIInteractionResponseChannelMessageWithSource,
    APIInteractionResponseUpdateMessage,
    ButtonStyle,
    ComponentType
} from "discord-api-types/v10";
import {CoinMetadata} from "../../structs/coinMetadata";
import {Candles, LatestCoins} from "../../utils/database";
import {binanceLastUpdated} from "../../services/binanceRest";
import got from "got";
import {FormDataEncoder} from "form-data-encoder";
import {deepPatchCustomId, emojis} from "../../utils/discordUtils";
import BigNumber from "bignumber.js";

export async function makeEmbed(choice: CoinMetadata) {
    const embed = getEmbedTemplate();
    embed.thumbnail = {
        url: `https://s2.coinmarketcap.com/static/img/coins/128x128/${choice.cmc_id}.png`
    };
    embed.image = {
        url: `attachment://${Date.now()}.png`
    };
    const coin = await LatestCoins.findOne({coin: choice.cmc_id});
    const latestCandle = await Candles.findOne({coin: choice.cmc_id}, {sort: {open_time: -1}});
    embed.color = new BigNumber(coin.weekPriceChangePercent).lt("0") ? 0xef5350 : 0x26a69a;
    embed.title = `${choice.name} (${choice.symbol}/USDT)`;
    embed.url = `https://coinmarketcap.com/currencies/${choice.slug}`;
    embed.fields = [{
        name: "Price",
        value: `$${formatPrice(new BigNumber(latestCandle.close_price))} ${new BigNumber(coin.weekPriceChangePercent).lt("0") ? emojis["bearish"] : emojis["bullish"]}`
    },
        {
            name: "24h High",
            value: `$${formatPrice(new BigNumber(coin.dayHighPrice))} ${emojis["bullish"]}`,
            inline: true
        },
        {
            name: "24h Low",
            value: `$${formatPrice(new BigNumber(coin.dayLowPrice))} ${emojis["bearish"]}`,
            inline: true
        },
        {
            name: "\u200b",
            value: "\u200b",
            inline: true
        },
        {
            name: "1h Change",
            value: `${new BigNumber(coin.hourPriceChangePercent).toFormat(2)}% ${new BigNumber(coin.hourPriceChangePercent).lt("0") ? emojis["bearish"] : emojis["bullish"]}`,
            inline: true
        },
        {
            name: "24h Change",
            value: `${new BigNumber(coin.dayPriceChangePercent).toFormat(2)}% ${new BigNumber(coin.dayPriceChangePercent).lt("0") ? emojis["bearish"] : emojis["bullish"]}`,
            inline: true
        },
        {
            name: "7d Change",
            value: `${new BigNumber(coin.weekPriceChangePercent).toFormat(2)}% ${new BigNumber(coin.weekPriceChangePercent).lt("0") ? emojis["bearish"] : emojis["bullish"]}`,
            inline: true
        },
        {
            name: "Last Updated",
            value: `<t:${Math.floor(binanceLastUpdated / 1000)}:R>`
        }
    ];
    return embed;
}

export async function makeFormData(payload: APIInteractionResponseChannelMessageWithSource | APIInteractionResponseUpdateMessage, coin: CoinMetadata) {
    const chartName = payload.data.embeds[0].image.url.replaceAll(new RegExp("attachment:\\/\\/|\\.png", "g"), "");
    payload.data.attachments = [{
        id: "0",
        filename: `${chartName}.png`,
        description: `Chart for ${coin.symbol}/USDT`
    }];
    const form = new FormData();
    const chart = await makeChart(coin);
    deepPatchCustomId(payload);
    form.set("payload_json", JSON.stringify(payload));
    form.set("files[0]", new Blob([chart]), `${chartName}.png`);
    return new FormDataEncoder(form as any);
}

export function formatPrice(price: BigNumber) {
    return price.lt("1") ? price.toPrecision(4).toString() : price.toFormat(2).replaceAll(new RegExp(",", "g"), "").toString();
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
