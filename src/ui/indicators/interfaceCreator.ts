/* istanbul ignore file */
import {Candles} from "../../utils/database";
import {CoinMetadata} from "../../structs/coinMetadata";
import {Candle} from "../../structs/candle";
import got from "got";
import {getEmbedTemplate} from "../templates";
import {client, emojis} from "../../utils/discordUtils";
import {formatPrice} from "../coin/interfaceCreator";
import {binanceLastUpdated} from "../../services/binanceRest";
import {APIActionRowComponent, APIButtonComponent, ButtonStyle, ComponentType} from "discord-api-types/v10";

export async function makeEmbed(coin: CoinMetadata) {
    const candles: Candle[] = await Candles.find({coin: coin.cmc_id}).sort({open_time: 1}).toArray();
    const price = candles[candles.length - 1].close_price;
    const result = await got("http://127.0.0.1:3001/indicators", {
        method: "POST",
        body: JSON.stringify({
            open: candles.map(candle => candle.open_price),
            high: candles.map(candle => candle.high_price),
            low: candles.map(candle => candle.low_price),
            close: candles.map(candle => candle.close_price),
            volume: candles.map(candle => candle.quote_volume)
        })
    }).text();

    const indicators = JSON.parse(result.replaceAll(new RegExp("NaN", "g"), "\"Not Enough Data\""));
    for (const key of Object.keys(indicators)) {
        if (isNaN(indicators[key])) {
            continue;
        }
        indicators[key] = formatPrice(indicators[key]);
    }

    const techIndicators =
        `RSI(14): ${indicators.rsi} - **${indicators.rsi <= 30 ? "Oversold " + emojis["bearish"] : indicators.rsi >= 70 ? "Overbought " + emojis["bullish"] : "Neutral"}**
STOCH(14, 6, 6): ${indicators.stoch} - **${indicators.stoch <= 20 ? "Oversold " + emojis["bearish"] : indicators.stoch >= 80 ? "Overbought " + emojis["bullish"] : "Neutral"}**
STOCHRSI(14, 6, 6): ${indicators.stochrsi} - **${indicators.stochrsi <= 20 ? "Oversold " + emojis["bearish"] : indicators.stochrsi >= 80 ? "Overbought " + emojis["bullish"] : "Neutral"}**
MACD(12, 26, 9): ${isNaN(indicators.macd.macd) ? "Not Enough Data" : formatPrice(indicators.macd.macd)} - **${indicators.macd.macdhist < 0 ? "Bearish " + emojis["bearish"] : indicators.macd.macdhist > 0 ? "Bullish " + emojis["bullish"] : "Neutral"}**
ADX(14): ${indicators.adx} - **${indicators.adx <= 25 ? "Weak Trend" : indicators.adx <= 50 ? "Strong Trend" : indicators.adx <= 75 ? "Very Strong Trend" : indicators.adx <= 100 ? "Extremely Strong Trend" : "Neutral"}**
Williams' %R(14): ${indicators.willr} - **${indicators.willr <= -80 ? "Oversold " + emojis["bearish"] : indicators.willr >= -20 ? "Overbought " + emojis["bullish"] : "Neutral"}**
CCI(14): ${indicators.cci}
ATR(14): ${indicators.atr} - **Price fluctuates by ±$${indicators.atr} on average**
ULTOSC(7, 14, 28): ${indicators.ultosc} - **${indicators.ultosc <= 30 ? "Oversold " + emojis["bearish"] : indicators.ultosc >= 70 ? "Overbought " + emojis["bullish"] : "Neutral"}**
ROC(14): ${indicators.roc} - **${indicators.roc <= -10 ? "Bearish " + emojis["bearish"] : indicators.roc >= 10 ? "Bullish " + emojis["bullish"] : "Neutral"}**`;
    const bullishIndicatorCount = techIndicators.match(new RegExp(emojis["bullish"], "g"))?.length ?? 0;
    const bearishIndicatorCount = techIndicators.match(new RegExp(emojis["bearish"], "g"))?.length ?? 0;
    const movingAverages =
        `SMA(5): ${indicators.sma5} - **${price < indicators.sma5 ? "Bearish " + emojis["bearish"] : price > indicators.sma5 ? "Bullish " + emojis["bullish"] : "Neutral"}**
SMA(10): ${indicators.sma10} - **${price < indicators.sma10 ? "Bearish " + emojis["bearish"] : price > indicators.sma10 ? "Bullish " + emojis["bullish"] : "Neutral"}**
SMA(20): ${indicators.sma20} - **${price < indicators.sma20 ? "Bearish " + emojis["bearish"] : price > indicators.sma20 ? "Bullish " + emojis["bullish"] : "Neutral"}**
SMA(50): ${indicators.sma50} - **${price < indicators.sma50 ? "Bearish " + emojis["bearish"] : price > indicators.sma50 ? "Bullish " + emojis["bullish"] : "Neutral"}**
SMA(100): ${indicators.sma100} - **${price < indicators.sma100 ? "Bearish " + emojis["bearish"] : price > indicators.sma100 ? "Bullish " + emojis["bullish"] : "Neutral"}**
SMA(200): ${indicators.sma200} - **${price < indicators.sma200 ? "Bearish " + emojis["bearish"] : price > indicators.sma200 ? "Bullish " + emojis["bullish"] : "Neutral"}**

EMA(5): ${indicators.ema5} - **${price < indicators.ema5 ? "Bearish " + emojis["bearish"] : price > indicators.ema5 ? "Bullish " + emojis["bullish"] : "Neutral"}**
EMA(10): ${indicators.ema10} - **${price < indicators.ema10 ? "Bearish " + emojis["bearish"] : price > indicators.ema10 ? "Bullish " + emojis["bullish"] : "Neutral"}**
EMA(20): ${indicators.ema20} - **${price < indicators.ema20 ? "Bearish " + emojis["bearish"] : price > indicators.ema20 ? "Bullish " + emojis["bullish"] : "Neutral"}**
EMA(50): ${indicators.ema50} - **${price < indicators.ema50 ? "Bearish " + emojis["bearish"] : price > indicators.ema50 ? "Bullish " + emojis["bullish"] : "Neutral"}**
EMA(100): ${indicators.ema100} - **${price < indicators.ema100 ? "Bearish " + emojis["bearish"] : price > indicators.ema100 ? "Bullish " + emojis["bullish"] : "Neutral"}**
EMA(200): ${indicators.ema200} - **${price < indicators.ema200 ? "Bearish " + emojis["bearish"] : price > indicators.ema200 ? "Bullish " + emojis["bullish"] : "Neutral"}**`;
    const bullishMovingAverageCount = movingAverages.match(new RegExp(emojis["bullish"], "g"))?.length ?? 0;
    const bearishMovingAverageCount = movingAverages.match(new RegExp(emojis["bearish"], "g"))?.length ?? 0;

    const embed = {
        ...getEmbedTemplate(),
        footer: {
            text: "This is not financial advice.",
            icon_url: `https://cdn.discordapp.com/avatars/${client.id}/${client.avatar}.png`
        },
        description: `The symbol next to an indicator (${emojis["bullish"]} or ${emojis["bearish"]}) indicates in which direction the coin's price is likely to go towards.`,
        title: `Indicators for ${coin.symbol}/USDT`,
        fields: [
            {
                name: "Technical Indicators",
                value:
                    `${techIndicators}
                
Verdict: **${bullishIndicatorCount / 7 > 0.7 ? "Bullish " + emojis["bullish"] : bearishIndicatorCount / 7 > 0.7 ? "Bearish " + emojis["bearish"] : "Neutral"}** (Bullish: ${bullishIndicatorCount}, Bearish: ${bearishIndicatorCount})`
            },
            {
                name: "Moving Averages",
                value:
                    `${movingAverages}
                
Verdict: **${bullishMovingAverageCount / 12 > 0.7 ? "Bullish " + emojis["bullish"] : bearishMovingAverageCount / 12 > 0.7 ? "Bearish " + emojis["bearish"] : "Neutral"}** (Bullish: ${bullishMovingAverageCount}, Bearish: ${bearishMovingAverageCount})`
            },
            {
                name: "Last Updated",
                value: `<t:${Math.floor(binanceLastUpdated / 1000)}:R>`
            }
        ],
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
                custom_id: `indicators_refresh_${choice.cmc_id}`,
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
