import {IndicatorResult, TechnicalIndicator} from "./abstractIndicator";
import {Candle} from "../candle";

export class Rsi extends TechnicalIndicator {
    override name = "RSI(14)";

    calculate(candles: Candle[]): IndicatorResult {
        let averageGain = 0, gainCount = 0;
        let averageLoss = 0, lossCount = 0;
        for (let i = 0; i < 14; i++) {
            const change = (candles[i].close_price - candles[i].open_price) / candles[i].open_price;
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
            return {result: "Strong Buy", value: 100};
        }
        const rsi = 100 - 100 / (1 + averageGain / 14 / (averageLoss / 14));
        const currentChange = (candles[0].close_price - candles[0].open_price) / candles[0].open_price;
        const step2 = 100 - 100 / (1 + (averageGain * 13 + Math.max(0, currentChange)) / (averageLoss + Math.abs(Math.min(0, currentChange))));
        return {
            result: rsi >= 70 ? "Strong Sell" : rsi >= 55 ? "Sell" : rsi <= 30 ? "Strong Buy" : rsi <= 45 ? "Buy" : "Neutral",
            value: step2
        };

    }

}