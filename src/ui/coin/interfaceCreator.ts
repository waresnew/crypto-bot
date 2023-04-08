/* istanbul ignore file */
import {getEmbedTemplate} from "../templates";
import {
    APIActionRowComponent,
    APIButtonComponent,
    APIInteraction,
    ButtonStyle,
    ComponentType
} from "discord-api-types/v10";
import {CoinMetadata} from "../../structs/coinMetadata";
import {Candles, LatestCoins} from "../../database";
import {scientificNotationToNumber} from "../../utils";
import {lastUpdated} from "../../services/binanceRest";
import got from "got";

export async function makeEmbed(choice: CoinMetadata) {
    const embed = getEmbedTemplate();
    embed.thumbnail = {
        url: `https://s2.coinmarketcap.com/static/img/coins/128x128/${choice.cmc_id}.png`
    };
    embed.description = await makeChart(choice);
    const coin = await LatestCoins.findOne({coin: choice.cmc_id});
    const latestCandle = await Candles.findOne({coin: choice.cmc_id}, {sort: {open_time: -1}});
    embed.color = coin.weekPriceChangePercent < 0 ? 0xed4245 : 0x3ba55c;
    embed.title = `${choice.name} (${choice.symbol}/USDT)`;
    embed.url = `https://coinmarketcap.com/currencies/${choice.slug}`;
    embed.fields = [{
        name: "Price",
        value: `$${formatPrice(latestCandle.close_price)} ${coin.weekPriceChangePercent < 0 ? "🔴" : "🟢"}`
    },
        {
            name: "24h High",
            value: `$${formatPrice(coin.dayHighPrice)} 🟢`,
            inline: true
        },
        {
            name: "24h Low",
            value: `$${formatPrice(coin.dayLowPrice)} 🔴`,
            inline: true
        },
        {
            name: "\u200b",
            value: "\u200b",
            inline: true
        },
        {
            name: "1h Change",
            value: `${Math.round(coin.hourPriceChangePercent * 100) / 100}% ${coin.hourPriceChangePercent < 0 ? "🔴" : "🟢"}`,
            inline: true
        },
        {
            name: "24h Change",
            value: `${Math.round(coin.dayPriceChangePercent * 100) / 100}% ${coin.dayPriceChangePercent < 0 ? "🔴" : "🟢"}`,
            inline: true
        },
        {
            name: "7d Change",
            value: `${Math.round(coin.weekPriceChangePercent * 100) / 100}% ${coin.weekPriceChangePercent < 0 ? "🔴" : "🟢"}`,
            inline: true
        },
        {
            name: "Last Updated",
            value: `<t:${Math.floor(lastUpdated / 1000)}:R>`
        }
    ];
    return embed;
}

export function formatPrice(price: number) {
    return price < 1 ? scientificNotationToNumber(Number(price).toPrecision(4)) : Math.round(price * 100) / 100;
}

export async function makeChart(coin: CoinMetadata) {
    const candles = await Candles.find({coin: coin.cmc_id}, {sort: {open_time: -1}, limit: 100}).toArray();
    const image = await got("127.0.0.1:3001", {
        method: "POST",
        body: JSON.stringify({
            meta: coin,
            candles: candles.map(candle => [candle.open_time, candle.open_price, candle.high_price, candle.low_price, candle.close_price, candle.quote_volume])
        })
    }).text();
    return image;

}

export async function makeButtons(choice: CoinMetadata, interaction: APIInteraction) {
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
