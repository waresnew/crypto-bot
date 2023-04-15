import {IndicatorResult, TechnicalIndicator} from "./abstractIndicator";

export class Rsi extends TechnicalIndicator {
    override name = "RSI(14)";

    override calculate(): IndicatorResult {
        let averageGain = 0, gainCount = 0;
        let averageLoss = 0, lossCount = 0;
        for (let i = 0; i < 14; i++) {
            const change = (this.candles[i].close_price - this.candles[i].open_price) / this.candles[i].open_price;
            if (change > 0) {
                averageGain += change;
                gainCount++;
            } else {
                averageLoss += change;
                lossCount++;
            }
        }
        averageGain /= gainCount;
        averageLoss /= lossCount;
        if (averageLoss == 0) {
            return {result: "Strongly Overbought", value: 100};
        }
        // eslint-disable-next-line @typescript-eslint/no-extra-parens
        const rsi = 100 - 100 / (1 + (averageGain / 14) / (averageLoss / 14));
        const currentChange = (this.candles[0].close_price - this.candles[0].open_price) / this.candles[0].open_price;
        const step2 = 100 - 100 / (1 + (averageGain * 13 + Math.max(0, currentChange)) / (averageLoss + Math.abs(Math.min(0, currentChange))));
        return {
            result: rsi >= 70 ? "Strongly Overbought" : rsi >= 55 ? "Overbought" : rsi <= 30 ? "Strongly Oversold" : rsi <= 45 ? "Oversold" : "Neutral",
            value: step2
        };

    }

}