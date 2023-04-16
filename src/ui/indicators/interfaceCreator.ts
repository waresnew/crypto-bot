import {Candles} from "../../utils/database";
import {CoinMetadata} from "../../structs/coinMetadata";
import {Candle} from "../../structs/candle";
import got from "got";
import {getEmbedTemplate} from "../templates";

export async function makeEmbed(coin: CoinMetadata) {
    const candles: Candle[] = await Candles.find({coin: coin.cmc_id}).sort({open_time: 1}).toArray();
    const result = JSON.parse(await got("http://127.0.0.1:3001/indicators", {
        method: "POST",
        body: JSON.stringify({
            open: candles.map(candle => candle.open_price),
            high: candles.map(candle => candle.high_price),
            low: candles.map(candle => candle.low_price),
            close: candles.map(candle => candle.close_price),
            volume: candles.map(candle => candle.quote_volume)
        })
    }).text());
    const embed = {
        ...getEmbedTemplate(),
        title: `Indicators for ${coin.name}`,
        description: JSON.stringify(result)
    };
    console.log(result);
    return embed;
}
