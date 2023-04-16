/* istanbul ignore file */
import {CoinMetadata} from "../../structs/coinMetadata";
import {Candle} from "../../structs/candle";
import {Candles} from "../../utils/database";
import got from "got";
import {client, emojis} from "../../utils/discordUtils";
import {getEmbedTemplate} from "../templates";
import {binanceLastUpdated} from "../../services/binanceRest";
import {APIActionRowComponent, APIButtonComponent, ButtonStyle, ComponentType} from "discord-api-types/v10";

export async function makeEmbed(coin: CoinMetadata) {
    const candles: Candle[] = await Candles.find({coin: coin.cmc_id}).sort({open_time: 1}).toArray();
    const result = await got("http://127.0.0.1:3001/patterns", {
        method: "POST",
        body: JSON.stringify({
            open: candles.map(candle => candle.open_price),
            high: candles.map(candle => candle.high_price),
            low: candles.map(candle => candle.low_price),
            close: candles.map(candle => candle.close_price),
            volume: candles.map(candle => candle.quote_volume)
        })
    }).text();
    const patterns = JSON.parse(result.replaceAll(new RegExp("NaN", "g"), "\"Not Enough Data\""));
    const visiblePatterns: { name: string, time: number, val: number, reliability: number }[] = [];
    for (const pattern of Object.keys(patterns)) {
        for (let i = 0; i < patterns[pattern].result.length; i++) {
            const candle = candles[i];
            if (patterns[pattern].result[i] != 0) {
                visiblePatterns.push({
                    name: pattern,
                    time: candle.open_time,
                    val: patterns[pattern].result[i],
                    reliability: patterns[pattern].reliability
                });
            }
        }
    }
    visiblePatterns.sort((a, b) => b.time - a.time);
    visiblePatterns.length = Math.min(visiblePatterns.length, 25);
    let description = "Candlestick patterns are a way to identify trends in the market. We rated each pattern below from 1 ⭐ to 3 ⭐ to indicate their general reliability. https://www.investopedia.com/articles/active-trading/092315/5-most-powerful-candlestick-patterns.asp\n";
    for (const pattern of visiblePatterns) {
        const date = new Date(pattern.time);
        const month = date.toLocaleString("default", {month: "long"});
        const day = date.getDate();
        description += `\n- ${pattern.val < 0 ? emojis["bearish"] : emojis["bullish"]} ${pattern.name} (${"⭐".repeat(pattern.reliability)}) on ${month} ${day}`;
    }
    const embed = {
        ...getEmbedTemplate(),
        title: `Recent Candlestick Patterns for ${coin.symbol}/USDT`,
        description: description,
        fields: [
            {
                name: "Last Updated",
                value: `<t:${Math.floor(binanceLastUpdated / 1000)}:R>`
            }
        ],
        footer: {
            text: "This is not financial advice.",
            icon_url: `https://cdn.discordapp.com/avatars/${client.id}/${client.avatar}.png`
        },
        thumbnail: {
            url: `https://s2.coinmarketcap.com/static/img/coins/64x64/${coin.cmc_id}.png`
        }
    };
    return embed;
}

export function makeButtons(choice: CoinMetadata) {
    return {
        type: ComponentType.ActionRow,
        components: [
            {
                type: ComponentType.Button,
                custom_id: `patterns_refresh_${choice.cmc_id}`,
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
