import {getLatestCandle, validCryptos} from "../../utils/coinUtils";
import {LatestCoins} from "../../utils/database";
import CryptoStat from "../cryptoStat";
import {evalInequality} from "../../utils/alertUtils";
import {idToMeta} from "../coinMetadata";
import {Alert} from "./alert";

export class CoinAlert extends Alert {
    coin: number;
    stat: string;
    threshold: number;
    direction: string;

    override async shouldTrigger() {
        if (!await super.shouldTrigger()) {
            return false;
        }
        let left = 0;
        const candle = await getLatestCandle(this.coin);
        const latest = await LatestCoins.findOne({coin: this.coin});
        /* istanbul ignore next */
        if (this.stat == CryptoStat.price.shortForm) {
            left = candle.close_price;
        } else if (this.stat == CryptoStat.percent_change_1h.shortForm) {
            left = latest.hourPriceChangePercent;
        } else if (this.stat == CryptoStat.percent_change_24h.shortForm) {
            left = latest.dayPriceChangePercent;
        } else if (this.stat == CryptoStat.percent_change_7d.shortForm) {
            left = latest.weekPriceChangePercent;
        }
        const expr = left + this.direction + this.threshold;
        return evalInequality(expr);
    }

    override async format(cryptoList = validCryptos) {
        const fancyStat = CryptoStat.shortToLong(this.stat);
        return `When ${fancyStat} of ${idToMeta(this.coin, cryptoList).name} is ${this.direction == "<" ? "less than" : "greater than"} ${(this.stat == "price" ? "$" : "") + this.threshold + (this.stat.endsWith("%") ? "%" : "")}`;
    }
}