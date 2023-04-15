import {IndicatorResult, TechnicalIndicator} from "./abstractIndicator";
import {Ema} from "./averages/ema";

export class Macd extends TechnicalIndicator {
    override name = "MACD(12,26)";

    override calculate(): IndicatorResult {
        const result = new Ema(this.candles).calculate(12) - new Ema(this.candles).calculate(26);
        return {
            result: result > 0 ? "Bullish" : result < 0 ? "Bearish" : "Neutral",
            value: result
        };
    }
}