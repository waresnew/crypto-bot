import {Candles} from "../../utils/database";
import {CoinMetadata} from "../../structs/coinMetadata";
import {Candle} from "../../structs/candle";

export async function makeEmbed(coin: CoinMetadata) {
    const candles: Candle[] = await Candles.find({coin: coin.cmc_id}).sort({open_time: 1}).toArray();
}
