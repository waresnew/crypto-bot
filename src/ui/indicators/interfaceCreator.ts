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
import BigNumber from "bignumber.js";

export async function makeEmbed(coin: CoinMetadata) {
    const candles: Candle[] = await Candles.find({coin: coin.cmc_id}).sort({open_time: 1}).toArray();
    const price = new BigNumber(candles[candles.length - 1].close_price);
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
        indicators[key] = formatPrice(new BigNumber(indicators[key]));
    }
    /*
    rsi >= 70 -> bullish, <=30 -> bearish
    stoch >= 80 -> overbought, <=20 -> oversold
    stochrsi >= 80 -> overbought, <=20 -> oversold
    macdhist > 0 -> bullish, < 0 -> bearish
    adx >= 25 -> trend, < 25 -> no trend | +di > -di -> bullish, -di > +di -> bearish
    williamsr >= -20 -> overbought, <= -80 -> oversold
    cci >= 100 -> overbought, <= -100 -> oversold
    ultosc >= 70 -> overbought, <= 30 -> oversold
    roc >= 10 -> bullish, <= -10 -> bearish
    bop > 0 -> bullish, < 0 -> bearish
    mfi >= 80 -> overbought, <= 20 -> oversold
    aroonosc > 0 bullish, < 0 bearish
     */
    const techIndicators =
        `RSI(14): ${indicators.rsi} - **${indicators.rsi <= 40 ? "Oversold " + emojis["bearish"] : indicators.rsi >= 60 ? "Overbought " + emojis["bullish"] : "Neutral"}**
STOCH(9, 6, 6): ${indicators.stoch} - **${indicators.stoch <= 40 ? "Oversold " + emojis["bearish"] : indicators.stoch >= 60 ? "Overbought " + emojis["bullish"] : "Neutral"}**
STOCHRSI(14, 6, 6): ${indicators.stochrsi} - **${indicators.stochrsi <= 40 ? "Oversold " + emojis["bearish"] : indicators.stochrsi >= 60 ? "Overbought " + emojis["bullish"] : "Neutral"}**
MACD(12, 26, 9): ${isNaN(indicators.macd.macd) ? "Not Enough Data" : formatPrice(new BigNumber(indicators.macd.macd))} - **${indicators.macd.macdhist < 0 ? "Bearish " + emojis["bearish"] : indicators.macd.macdhist > 0 ? "Bullish " + emojis["bullish"] : "Neutral"}**
ADX(14): ${isNaN(indicators.adx.adx) ? "Not Enough Data" : formatPrice(new BigNumber(indicators.adx.adx))} - **${indicators.adx.adx <= 25 ? "Neutral" : indicators.adx.plus_di > indicators.adx.minus_di ? "Bullish " + emojis["bullish"] : indicators.adx.minus_di > indicators.adx.plus_di ? "Bearish " + emojis["bearish"] : "Neutral"}**
Williams' %R(14): ${indicators.willr} - **${indicators.willr <= -60 ? "Oversold " + emojis["bearish"] : indicators.willr >= -40 ? "Overbought " + emojis["bullish"] : "Neutral"}**
CCI(14): ${indicators.cci} - **${indicators.cci <= -80 ? "Oversold " + emojis["bearish"] : indicators.cci >= 80 ? "Overbought " + emojis["bullish"] : "Neutral"}**
ATR(14): ${isNaN(indicators.atr.atr) ? "Not Enough Data" : formatPrice(new BigNumber(indicators.atr.atr))} - **${indicators.atr.atr > indicators.atr.atrma14 ? "High Volatility" : indicators.atr.atr > indicators.atr.atrma7 ? "Moderate Volatility" : indicators.atr.atr <= indicators.atr.atrma7 ? "Less Volatility" : "Neutral"}**
ULTOSC(7, 14, 28): ${indicators.ultosc} - **${indicators.ultosc <= 40 ? "Oversold " + emojis["bearish"] : indicators.ultosc >= 60 ? "Overbought " + emojis["bullish"] : "Neutral"}**
ROC(14): ${indicators.roc} - **${indicators.roc < 0 ? "Bearish " + emojis["bearish"] : indicators.roc > 0 ? "Bullish " + emojis["bullish"] : "Neutral"}**
BOP: ${indicators.bop} - **${indicators.bop < 0 ? "Bearish " + emojis["bearish"] : indicators.bop > 0 ? "Bullish " + emojis["bullish"] : "Neutral"}**
MFI(14): ${indicators.mfi} - **${indicators.mfi <= 40 ? "Oversold " + emojis["bearish"] : indicators.mfi >= 60 ? "Overbought " + emojis["bullish"] : "Neutral"}**
AROON(14): ${indicators.aroonosc} - **${indicators.aroonosc < 0 ? "Bearish " + emojis["bearish"] : indicators.aroonosc > 0 ? "Bullish " + emojis["bullish"] : "Neutral"}**`;

    const bullishIndicatorCount = techIndicators.match(new RegExp(emojis["bullish"], "g"))?.length ?? 0;
    const bearishIndicatorCount = techIndicators.match(new RegExp(emojis["bearish"], "g"))?.length ?? 0;
    const movingAverages =
        `SMA(5): ${indicators.sma5} - **${price.lt(indicators.sma5) ? "Bearish " + emojis["bearish"] : price.gt(indicators.sma5) ? "Bullish " + emojis["bullish"] : "Neutral"}**
SMA(10): ${indicators.sma10} - **${price.lt(indicators.sma10) ? "Bearish " + emojis["bearish"] : price.gt(indicators.sma10) ? "Bullish " + emojis["bullish"] : "Neutral"}**
SMA(20): ${indicators.sma20} - **${price.lt(indicators.sma20) ? "Bearish " + emojis["bearish"] : price.gt(indicators.sma20) ? "Bullish " + emojis["bullish"] : "Neutral"}**
SMA(50): ${indicators.sma50} - **${price.lt(indicators.sma50) ? "Bearish " + emojis["bearish"] : price.gt(indicators.sma50) ? "Bullish " + emojis["bullish"] : "Neutral"}**
SMA(100): ${indicators.sma100} - **${price.lt(indicators.sma100) ? "Bearish " + emojis["bearish"] : price.gt(indicators.sma100) ? "Bullish " + emojis["bullish"] : "Neutral"}**
SMA(200): ${indicators.sma200} - **${price.lt(indicators.sma200) ? "Bearish " + emojis["bearish"] : price.gt(indicators.sma200) ? "Bullish " + emojis["bullish"] : "Neutral"}**

EMA(5): ${indicators.ema5} - **${price.lt(indicators.ema5) ? "Bearish " + emojis["bearish"] : price.gt(indicators.ema5) ? "Bullish " + emojis["bullish"] : "Neutral"}**
EMA(10): ${indicators.ema10} - **${price.lt(indicators.ema10) ? "Bearish " + emojis["bearish"] : price.gt(indicators.ema10) ? "Bullish " + emojis["bullish"] : "Neutral"}**
EMA(20): ${indicators.ema20} - **${price.lt(indicators.ema20) ? "Bearish " + emojis["bearish"] : price.gt(indicators.ema20) ? "Bullish " + emojis["bullish"] : "Neutral"}**
EMA(50): ${indicators.ema50} - **${price.lt(indicators.ema50) ? "Bearish " + emojis["bearish"] : price.gt(indicators.ema50) ? "Bullish " + emojis["bullish"] : "Neutral"}**
EMA(100): ${indicators.ema100} - **${price.lt(indicators.ema100) ? "Bearish " + emojis["bearish"] : price.gt(indicators.ema100) ? "Bullish " + emojis["bullish"] : "Neutral"}**
EMA(200): ${indicators.ema200} - **${price.lt(indicators.ema200) ? "Bearish " + emojis["bearish"] : price.gt(indicators.ema200) ? "Bullish " + emojis["bullish"] : "Neutral"}**`;
    const bullishMovingAverageCount = movingAverages.match(new RegExp(emojis["bullish"], "g"))?.length ?? 0;
    const bearishMovingAverageCount = movingAverages.match(new RegExp(emojis["bearish"], "g"))?.length ?? 0;

    const embed = {
        ...getEmbedTemplate(),
        footer: {
            text: "This is not financial advice.",
            icon_url: `https://cdn.discordapp.com/avatars/${client.id}/${client.avatar}.png`
        },
        description: `Technical indicators are mathematical calculations applied to stock prices and/or volumes to identify patterns, trends, and potential price movements in the market. These indicators are calculated using daily prices. The symbol next to an indicator (${emojis["bullish"]} or ${emojis["bearish"]}) shows whether prices are likely to increase or decrease, based on that indicator.`,
        title: `Indicators for ${coin.symbol}/USDT`,
        fields: [
            {
                name: "Technical Indicators",
                value:
                    `${techIndicators}
                
Verdict: **${bullishIndicatorCount > bearishIndicatorCount ? "Bullish " + emojis["bullish"] : bearishIndicatorCount > bullishIndicatorCount ? "Bearish " + emojis["bearish"] : "Neutral"}** (Bullish: ${bullishIndicatorCount}, Bearish: ${bearishIndicatorCount}, Neutral: ${12 - bullishIndicatorCount - bearishIndicatorCount})`
            },
            {
                name: "Moving Averages",
                value:
                    `${movingAverages}
                
Verdict: **${bullishMovingAverageCount > bearishMovingAverageCount ? "Bullish " + emojis["bullish"] : bearishMovingAverageCount > bullishMovingAverageCount ? "Bearish " + emojis["bearish"] : "Neutral"}** (Bullish: ${bullishMovingAverageCount}, Bearish: ${bearishMovingAverageCount}, Neutral: ${12 - bullishMovingAverageCount - bearishMovingAverageCount})`
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
