import {IndicatorResult, TechnicalIndicator} from "./abstractIndicator";

export class Cci extends TechnicalIndicator {
    override name = "CCI(14)";

    override calculate(): IndicatorResult {
        let tp = 0;
        for (let i = 0; i < 14; i++) {
            tp += (this.candles[i].high_price + this.candles[i].low_price + this.candles[i].close_price) / 3;
        }
        const sma = tp / 14;
        let md = 0;
        for (let i = 0; i < 14; i++) {
            md += Math.abs((this.candles[i].high_price + this.candles[i].low_price + this.candles[i].close_price) / 3 - sma);
        }
        const result = (tp - sma) / (md * 0.015);
        return {
            result: result >= 100 ? "Strongly Overbought" : result >= 80 ? "Overbought" : result <= -100 ? "Strongly Oversold" : result <= -80 ? "Oversold" : "Neutral",
            value: result
        };
    }
}