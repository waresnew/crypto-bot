import {Indexable} from "../utils/utils";
//no need to store gas in db (small ram usage)
export const gasPrices = {
    slow: Infinity,
    normal: Infinity,
    fast: Infinity
} as Indexable;