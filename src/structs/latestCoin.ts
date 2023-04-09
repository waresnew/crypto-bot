
export interface LatestCoin {
    //rest data
    coin: number;
    weekPriceChangePercent: number;
    weekWeightedAvgPrice: number;
    weekHighPrice: number;
    weekLowPrice: number;
    //websocket data (apparently binance only updates these if they changed so if they didn't change then assume %change is 0 etc)
    dayPriceChangePercent?: number;
    dayWeightedAvgPrice?: number;
    dayHighPrice?: number;
    dayLowPrice?: number;
    hourPriceChangePercent?: number;
    hourWeightedAvgPrice?: number;
    hourHighPrice?: number;
    hourLowPrice?: number;
}