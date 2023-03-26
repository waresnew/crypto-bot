// @ts-ignore
import mongoose, {HydratedDocument, InferSchemaType, Schema} from "mongoose";

/**
 * Wrapper for https://pro-api.coinmarketcap.com/v1/cryptocurrency/listings/latest endpoint
 */
const schema = new Schema({
    /**The cryptocurrency's CoinMarketCap rank by market cap. */
    cmc_rank: {type: Number, required: true},
    /**The unique CoinMarketCap ID for this cryptocurrency.*/
    id: {type: Number, required: true, unique: true},
    /**The name of this cryptocurrency.*/
    name: {type: String, default: null, index: true},
    /**web friendly name */
    slug: {type: String, default: null},
    /**The ticker symbol for this cryptocurrency.*/
    symbol: {type: String, default: null, index: true},
    //quote data starts
    /**Fully diluted market cap in the specified currency. */
    fully_diluted_market_cap: {type: Number, required: true},
    /**Timestamp (ISO 8601) of when the conversion currency's current value was referenced. */
    last_updated: {type: String, default: null},
    /**Market cap in the specified currency. */
    market_cap: {type: Number, required: true},
    /**Market cap dominance in the specified currency. */
    market_cap_dominance: {type: Number, required: true},
    /**1 hour change in the specified currency. */
    percent_change_1h: {type: Number, required: true},
    /**24 hour change in the specified currency. */
    percent_change_24h: {type: Number, required: true},
    /**7 day change in the specified currency. */
    percent_change_7d: {type: Number, required: true},
    /**Price in the specified currency for this historical. */
    price: {type: Number, required: true},
    /**Rolling 24 hour adjusted volume in the specified currency. */
    volume_24h: {type: Number, required: true},
    /**24 hour change in the specified currencies volume. */
    volume_change_24h: {type: Number, required: true}
}, {id: false});
export const CmcLatestListingModel = mongoose.model("CmcLatestListing", schema);
export type CmcLatestListing = HydratedDocument<InferSchemaType<typeof schema>>;