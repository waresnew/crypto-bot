import {Indexable} from "../utils/utils";
//no need to store gas in db (small ram usage)
export const gasPrices = {
    slow: 0,
    normal: 0,
    fast: 0
} as Indexable;