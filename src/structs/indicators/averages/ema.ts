import {Candle} from "../../candle";

export class Ema {
    candles: Candle[];

    constructor(candles: Candle[]) {
        this.candles = candles;
    }

    calculate(period: number): number {
        const dp: number[] = Array(period + 1).fill(0);
        dp[period] = this.candles[period].close_price;
        for (let i = period - 1; i >= 0; i--) {
            const k = 2 / (period + 1);
            dp[i] = this.candles[i].close_price * k + dp[i + 1] * (1 - k);
        }
        return dp[0];
    }
}