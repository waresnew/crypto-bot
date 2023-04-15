import {Candle} from "../../candle";

export class Sma {
    candles: Candle[];

    constructor(candles: Candle[]) {
        this.candles = candles;
    }

    calculate(period: number): number {
        let sum = 0;
        for (let i = 0; i < period; i++) {
            sum += this.candles[i].close_price;
        }
        return sum / period;
    }
}