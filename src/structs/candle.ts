export interface Candle {
    coin: number;
    open_time: number;
    open_price: number;
    high_price: number;
    low_price: number;
    close_price: number;
    base_volume: number;
    close_time: number;
    quote_volume: number;
    trades_count: number;
    taker_base_volume: number;
    taker_quote_volume: number;
    ignore: number;
}
