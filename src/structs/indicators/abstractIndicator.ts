import {Candle} from "../candle";

export type IndicatorResult = { result: "Buy" | "Strong Buy" | "Sell" | "Strong Sell" | "Overbought" | "Oversold" | "Neutral", value: number };

export abstract class TechnicalIndicator {
    name: string;

    //candles must be in descending order by open time
    abstract calculate(candles: Candle[]): IndicatorResult;
}