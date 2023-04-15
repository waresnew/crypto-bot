import {IndicatorResult, TechnicalIndicator} from "./abstractIndicator";

export class Atr extends TechnicalIndicator {
    override name = "ATR(14)";

    override calculate(): IndicatorResult {
        let cur;
        let trSumTotal = 0;
        for (let p = 0; p < 14; p++) {
            let trSum = 0;
            for (let i = p; i < p + 14; i++) {
                const tr = Math.max(this.candles[i].high_price - this.candles[i].low_price, Math.abs(this.candles[i].high_price - this.candles[i + 1].close_price), Math.abs(this.candles[i].low_price - this.candles[i + 1].close_price));
                trSum += tr;
            }
            const smoothedTr = trSum / 14 * 100;
            if (p == 0) {
                cur = smoothedTr;
            }
            trSumTotal += smoothedTr;
        }
        return {
            result: cur > 2 * (trSumTotal / 14) ? "High Volatility" : cur < trSumTotal / 14 ? "Low Volatility" : "Moderate Volatility",
            value: cur
        };
    }
}