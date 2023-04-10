import {validCryptos} from "../utils";

export class CoinMetadata {
    cmc_id: number;
    symbol: string;
    name: string;
    slug: string;
}

export function symbolToMeta(symbol: string, cryptoList = validCryptos) {
    return cryptoList.find(metadata => metadata.symbol == symbol);
}

export function nameToMeta(name: string, cryptoList = validCryptos) {
    return cryptoList.find(metadata => metadata.name == name);
}

export function idToMeta(id: number, cryptoList = validCryptos) {
    return cryptoList.find(metadata => metadata.cmc_id == id);
}