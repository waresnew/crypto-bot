import {Indexable} from "../utils";

export default class CryptoStat {

    //end with % if you want % to be displayed
    //db form = percent_change_1h, shortform = 1h%, longform = 1 hour change
    static price = new CryptoStat("price", "price");
    static percent_change_1h = new CryptoStat("1h%", "1 hour price change");
    static percent_change_24h = new CryptoStat("24h%", "24 hour price change");
    static percent_change_7d = new CryptoStat("7d%", "7 day price change");
    static volume_change_24h = new CryptoStat("volume%", "24 hour volume change");

    shortForm: string;
    longForm: string;

    constructor(shortForm: string, longForm: string) {
        this.shortForm = shortForm;
        this.longForm = longForm;
    }

    static getProp(key: string) {
        return (CryptoStat as Indexable)[key];
    }

    static listShorts() {
        return Object.keys(CryptoStat).map(c => CryptoStat.getProp(c).shortForm);
    }

    static listLongs() {
        return Object.keys(CryptoStat).map(c => CryptoStat.getProp(c).longForm);
    }

    static shortToLong(short: string) {
        return CryptoStat.getProp(Object.keys(CryptoStat).find(c => CryptoStat.getProp(c).shortForm == short)).longForm;
    }

    static longToShort(long: string) {
        return CryptoStat.getProp(Object.keys(CryptoStat).find(c => CryptoStat.getProp(c).longForm == long)).shortForm;
    }
}