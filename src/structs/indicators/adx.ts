import {IndicatorResult, TechnicalIndicator} from "./abstractIndicator";
import {Atr} from "./atr";

export class Adx extends TechnicalIndicator {
    override name = "ADX(14)";

    override calculate(): IndicatorResult {
        let dxSum = 0;
        let diPlusFirst = 0, diMinusFirst = 0;
        for (let p = 0; p < 14; p++) {
            let dmPlusSum = 0, dmMinusSum = 0;
            for (let i = p; i < p + 14; i++) {
                const dmPlus = Math.max(0, this.candles[i].high_price - this.candles[i + 1].high_price);
                const dmMinus = Math.max(0, this.candles[i + 1].low_price - this.candles[i].low_price);
                dmPlusSum += dmPlus;
                dmMinusSum += dmMinus;
            }
            const smoothedDmPlus = dmPlusSum - dmPlusSum / 14 + Math.max(0, this.candles[p].high_price - this.candles[p + 1].high_price);
            const smoothedDmMinus = dmMinusSum - dmMinusSum / 14 + Math.max(0, this.candles[p + 1].low_price - this.candles[p].low_price);
            const smoothedTr = new Atr(this.candles.slice(p)).calculate().value;
            const diPlus = smoothedDmPlus / smoothedTr * 100;
            const diMinus = smoothedDmMinus / smoothedTr * 100;
            if (p == 0) {
                diPlusFirst = diPlus;
                diMinusFirst = diMinus;
            }
            const dx = Math.abs(diPlus - diMinus) / Math.abs(diPlus + diMinus) * 100;
            dxSum += dx;
        }

        return {
            result: dxSum / 14 <= 25 ? "Neutral" : `${dxSum / 14 <= 50 ? "" : "Strongly "}${diPlusFirst > diMinusFirst ? "Bullish" : "Bearish"}`,
            value: dxSum / 14
        };
    }
}