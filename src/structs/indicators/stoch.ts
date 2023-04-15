import {IndicatorResult, TechnicalIndicator} from "./abstractIndicator";

export class Stoch extends TechnicalIndicator {
    override name = "STOCH(9,6)";

    override calculate(): IndicatorResult {
        let d = 0;
        for (let i = 0; i < 6; i++) {
            const periodLow = Math.min(...this.candles.slice(0, i + 9).map(candle => candle.low_price));
            const periodHigh = Math.max(...this.candles.slice(0, i + 9).map(candle => candle.high_price));
            if (periodHigh - periodLow == 0) {
                return {result: "Strongly Overbought", value: 100};
            }
            const rawK = (this.candles[i].close_price - periodLow) / (periodHigh - periodLow) * 100;
            d += rawK;
        }
        d /= 6;
        return {
            result: d >= 80 ? "Strongly Overbought" : d >= 55 ? "Overbought" : d <= 20 ? "Strongly Oversold" : d <= 50 ? "Oversold" : "Neutral",
            value: d
        };
    }
}