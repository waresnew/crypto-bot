import {IndicatorResult, TechnicalIndicator} from "./abstractIndicator";

export class Williams extends TechnicalIndicator {
    override name = "Williams %R(14)";

    override calculate(): IndicatorResult {
        let highestHigh = 0;
        let lowestLow = 0;
        for (let i = 0; i < 14; i++) {
            const candle = this.candles[i];
            highestHigh = Math.max(highestHigh, candle.high_price);
            lowestLow = Math.min(lowestLow, candle.low_price);
        }
        const result = (highestHigh - this.candles[0].close_price) / (highestHigh - lowestLow) * 100;
        return {
            result: result <= -80 ? "Strongly Oversold" : result <= -60 ? "Oversold" : result >= -20 ? "Strongly Overbought" : result >= -40 ? "Overbought" : "Neutral",
            value: result
        };
    }
}