import {cryptoMetadataList} from "../utils";

export class CoinMetadata {
    cmc_id: number;
    symbol: string;
    name: string;
    slug: string;
}

export function symbolToMeta(symbol: string) {
    return cryptoMetadataList.find(metadata => metadata.symbol == symbol);
}

export function nameToMeta(name: string) {
    return cryptoMetadataList.find(metadata => metadata.name == name);
}

export function idToMeta(id: number) {
    return cryptoMetadataList.find(metadata => metadata.cmc_id == id);
}