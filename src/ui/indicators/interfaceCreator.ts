import {Candles} from "../../utils/database";
import {CoinMetadata} from "../../structs/coinMetadata";
import {Candle} from "../../structs/candle";
import got from "got";
import {getEmbedTemplate} from "../templates";
import {client} from "../../utils/discordUtils";

export async function makeEmbed(coin: CoinMetadata) {
    const candles: Candle[] = await Candles.find({coin: coin.cmc_id}).sort({open_time: 1}).toArray();
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

    const parsed = JSON.parse(result.replaceAll(new RegExp("\\bNaN\\b"), "Not Enough Data"));
    const indicators = parsed.indicators;
    for (const key of Object.keys(indicators)) {
        if (isNaN(indicators[key])) {
            continue;
        }
        indicators[key] = Math.round(indicators[key] * 100) / 100;
    }
    const embed = {
        ...getEmbedTemplate(),
        footer: {
            text: "Please note that this is not financial advice.",
            icon_url: `https://cdn.discordapp.com/avatars/${client.id}/${client.avatar}.png`
        },
        title: `Indicators for ${coin.name}`,
        description: `**Technical Indicators**
    **RSI(14):** ${indicators.rsi}
    **STOCH(14, 6, 6):** ${indicators.stoch}
    **STOCHRSI(14, 6, 6):** ${indicators.stochrsi}
    **MACD(12, 26, 9):** ${indicators.macd}
    **ADX(14):** ${indicators.adx}
    **Williams' %R(14):** ${indicators.willr}
    **CCI(14):** ${indicators.cci}
    **ATR(14):** ${indicators.atr}
    **ULTOSC(7, 14, 28):** ${indicators.ultosc}
    **ROC(14):** ${indicators.roc}

    **Moving Averages**
    SMA(5): ${indicators.sma5}
    SMA(10): ${indicators.sma10}
    SMA(20): ${indicators.sma20}
    SMA(50): ${indicators.sma50}
    SMA(100): ${indicators.sma100}
    SMA(200): ${indicators.sma200}
    
    EMA(5): ${indicators.ema5}
    EMA(10): ${indicators.ema10}
    EMA(20): ${indicators.ema20}
    EMA(50): ${indicators.ema50}
    EMA(100): ${indicators.ema100}
    EMA(200): ${indicators.ema200}
    `
    };
    return embed;
}
