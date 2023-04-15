import {Candle} from "../../candle";

export abstract class CandlePattern {
    reliability: 1 | 2 | 3;
    name: string;
    time: number;

    abstract exists(candles: Candle[]): boolean;
}