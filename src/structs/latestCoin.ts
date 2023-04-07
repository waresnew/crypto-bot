import {LatestCoins} from "../database";

export interface LatestCoin {
    coin: number;
    //unix timestamp for the start of the minute (exact to the millisecond)
    open_time: number;
    //close price for the minute
    price: number;
    //volume for the minute
    volume: number;
}

export async function calcStat(coin: number, stat: string) {
    if (stat === "price") {
        const result = await LatestCoins.findOne({coin: coin}, {sort: {open_time: -1}});
        return result.price;
    } else if (stat == "1h%") {
        return await getPercentChange(coin, 60, "price");
    } else if (stat == "24h%") {
        return await getPercentChange(coin, 1440, "price");
    } else if (stat == "7d%") {
        return await getPercentChange(coin, 10080, "price");
    } else if (stat == "volume%") {
        return await getPercentChange(coin, 1440, "volume");
    }
    throw new Error("Invalid stat");
}

async function getPercentChange(coin: number, skip: number, stat: string) {
    const now = await LatestCoins.findOne({coin: coin}, {sort: {open_time: -1}});
    let ago = await LatestCoins.findOne({
        coin: coin,
        open_time: {$lte: now.open_time - 60000 * skip}
    }, {sort: {open_time: -1}});
    if (!ago) {
        //data too recent so get oldest one
        ago = await LatestCoins.findOne({coin: coin}, {sort: {open_time: 1}});
    }
    //@ts-ignore
    return (now[stat] - ago[stat]) / ago[stat] * 100;
}