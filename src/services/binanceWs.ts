/* istanbul ignore file */
import WebSocket from "ws";
import {AnyBulkWriteOperation} from "mongodb";
import {LatestCoin} from "../structs/latestCoin";
import {symbolToMeta} from "../structs/coinMetadata";
import {LatestCoins} from "../utils/database";
import {getBinanceWsUrl} from "../utils/coinUtils";

export let ws: WebSocket = null;
export let retry = true;

export function setRetry(value: boolean) {
    retry = value;
}

export function initBinanceWs() {
    ws = new WebSocket(getBinanceWsUrl());
    ws.on("error", console.error);
    ws.on("ping", () => {
        ws.pong();
    });
    ws.on("close", () => {
        if (retry) {
            console.log("Binance WS closed, reconnecting in 5s");
            setTimeout(initBinanceWs, 5000);
        }
    });
    ws.on("open", function open() {
        console.log("Binance WS connected");
        ws.send(JSON.stringify({
            method: "SUBSCRIBE",
            params: [
                "!ticker_1h@arr",
                "!ticker_1d@arr"
            ],
            id: 1
        }));
    });

    ws.on("message", async data => {
        const json = JSON.parse(data.toString());
        if (json.result === null) {
            return;
        }
        const toWrite: AnyBulkWriteOperation<LatestCoin>[] = [];
        for (const item of json) {
            if (item.s.endsWith("USDT")) {
                const coin = await symbolToMeta(item.s.substring(0, item.s.lastIndexOf("USDT")));
                if (coin) {
                    const set = item.e == "1dTicker" ? {
                        dayPriceChangePercent: item.P,
                        dayWeightedAvgPrice: item.w,
                        dayHighPrice: item.h,
                        dayLowPrice: item.l
                    } : item.e == "1hTicker" ? {
                        hourPriceChangePercent: item.P,
                        hourWeightedAvgPrice: item.w,
                        hourHighPrice: item.h,
                        hourLowPrice: item.l
                    } : null;
                    if (!set) {
                        throw new Error("Unknown event type: " + item.e);
                    }
                    toWrite.push({
                        updateOne: {
                            filter: {coin: coin.cmc_id},
                            update: {
                                $set: set
                            }
                        }
                    });
                }
            }
        }
        if (toWrite.length > 0) {
            await LatestCoins.bulkWrite(toWrite);
        }
    });
}