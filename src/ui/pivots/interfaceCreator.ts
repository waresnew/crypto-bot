/* istanbul ignore file */
import {CoinMetadata} from "../../structs/coinMetadata";
import {Candle} from "../../structs/candle";
import {Candles} from "../../utils/database";
import got from "got";
import {getEmbedTemplate} from "../templates";
import {client} from "../../utils/discordUtils";
import {formatPrice} from "../coin/interfaceCreator";

export async function makeEmbed(coin: CoinMetadata) {
    const candles: Candle[] = await Candles.find({coin: coin.cmc_id}).sort({open_time: 1}).toArray();
    const result = await got("http://127.0.0.1:3001/pivots", {
        method: "POST",
        body: JSON.stringify({
            open: candles.map(candle => candle.open_price),
            high: candles.map(candle => candle.high_price),
            low: candles.map(candle => candle.low_price),
            close: candles.map(candle => candle.close_price),
            volume: candles.map(candle => candle.quote_volume)
        })
    }).text();

    const pivots = JSON.parse(result.replaceAll(new RegExp("NaN", "g"), "\"Not Enough Data\""));
    for (const key of Object.keys(pivots)) {
        for (const key2 of Object.keys(pivots[key])) {
            if (isNaN(pivots[key][key2])) {
                continue;
            }
            pivots[key][key2] = formatPrice(pivots[key][key2]);
        }
    }
    const methodOrder = ["Classic", "Fibonacci", "Camarilla", "Woodie", "DeMark"];
    const pivotPoints: any = {};
    for (const pivot of Object.keys(pivots).sort((a, b) => methodOrder.indexOf(a) - methodOrder.indexOf(b))) {
        pivotPoints[pivot] = {};
        for (const key of Object.keys(pivots[pivot])) {
            pivotPoints[pivot][key] = pivots[pivot][key];
        }
    }
    const fields = [];
    const statOrder = ["S3", "S2", "S1", "Pivot", "R1", "R2", "R3"];
    for (const pivot of Object.keys(pivotPoints)) {
        const field = {
            name: pivot,
            value: "",
            inline: true
        };
        for (const key of Object.keys(pivotPoints[pivot]).sort((a, b) => statOrder.indexOf(a) - statOrder.indexOf(b))) {
            field.value += `${key}: ${pivotPoints[pivot][key]}\n`;
        }
        field.value = field.value.trim();
        fields.push(field);
    }

    const embed = {
        ...getEmbedTemplate(),
        title: `Pivot Points for ${coin.symbol}/USDT`,
        description: "Pivot points are levels at which the direction of price movement may change. https://www.investopedia.com/terms/p/pivotpoint.asp",
        footer: {
            text: "This is not financial advice.",
            icon_url: `https://cdn.discordapp.com/avatars/${client.id}/${client.avatar}.png`
        },
        fields: fields
    };
    return embed;
}