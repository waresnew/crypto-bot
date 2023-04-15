import {IndicatorResult, TechnicalIndicator} from "./abstractIndicator";
import {Rsi} from "./rsi";

export class StochRsi extends TechnicalIndicator {
    override name = "STOCHRSI(14)";

    override calculate(): IndicatorResult {
        const rsi: number[] = [];
        for (let i = 0; i < 14; i++) {
            const cur = new Rsi(this.candles.slice(i, i + 14));
            rsi.push(cur.calculate().value);
        }
        const result = Math.max(...rsi) - Math.min(...rsi) == 0 ? 100 : 100 * (rsi[0] - Math.min(...rsi)) / (Math.max(...rsi) - Math.min(...rsi));
        return {
            result: result >= 80 ? "Strongly Overbought" : result >= 55 ? "Overbought" : result <= 20 ? "Strongly Oversold" : result <= 50 ? "Oversold" : "Neutral",
            value: result
        };
    }
}