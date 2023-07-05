import {CoinMetadatas} from "../utils/database";

export class CoinMetadata {
    cmc_id: number;
    symbol: string;
    name: string;
    slug: string;
}

export async function symbolToMeta(symbol: string) {
    return await CoinMetadatas.findOne({symbol: symbol});
}

export async function nameToMeta(name: string) {
    return await CoinMetadatas.findOne({name: name});
}

export async function idToMeta(id: number) {
    return await CoinMetadatas.findOne({cmc_id: id});
}