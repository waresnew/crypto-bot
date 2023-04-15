import {Candle} from "../candle";

export type IndicatorResult = { result: "Buy" | "Strong Buy" | "Sell" | "Strong Sell" | "Overbought" | "Oversold" | "Neutral" | "Strongly Overbought" | "Strongly Oversold" | "Bullish" | "Bearish" | "Strongly Bullish" | "Strongly Bearish" | "High Volatility" | "Low Volatility" | "Moderate Volatility", value: number };

export abstract class TechnicalIndicator {
    name: string;
    candles: Candle[];

    constructor(candles: Candle[]) {
        this.candles = candles;
    }

    //candles must be in descending order by open time
    abstract calculate(): IndicatorResult;
}