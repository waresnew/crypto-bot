export interface Candle {
    coin: number;
    open_time: number;
    open_price: string;
    high_price: string;
    low_price: string;
    close_price: string;
    base_volume: string;
    close_time: number;
    quote_volume: string;
    trades_count: number;
    taker_base_volume: string;
    taker_quote_volume: string;
    ignore: string;
}
