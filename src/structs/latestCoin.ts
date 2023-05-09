export interface LatestCoin {
    //rest data
    coin: number;
    weekPriceChangePercent: string;
    weekWeightedAvgPrice: string;
    weekHighPrice: string;
    weekLowPrice: string;
    //websocket data (apparently binance only updates these if they changed so if they didn't change then assume %change is 0 etc)
    dayPriceChangePercent?: string;
    dayWeightedAvgPrice?: string;
    dayHighPrice?: string;
    dayLowPrice?: string;
    hourPriceChangePercent?: string;
    hourWeightedAvgPrice?: string;
    hourHighPrice?: string;
    hourLowPrice?: string;
}