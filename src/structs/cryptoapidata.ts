// noinspection JSUnusedGlobalSymbols

/**
 * Wrapper for https://pro-api.coinmarketcap.com/v1/cryptocurrency/listings/latest endpoint
 */

export class CryptoApiData {
    [index: string]: string | number;

    /**fill the table */
    dummy = 0;
    /**The cryptocurrency's CoinMarketCap rank by market cap. */
    cmc_rank = 0;
    /**The unique CoinMarketCap ID for this cryptocurrency.*/
    id = 0;
    /**The name of this cryptocurrency.*/
    name: string = null;
    /**web friendly name */
    slug: string = null;
    /**The ticker symbol for this cryptocurrency.*/
    symbol: string = null;
    //QUOTE DATA
    /**Fully diluted market cap in the specified currency. */
    fully_diluted_market_cap = 0;
    /**Timestamp (ISO 8601) of when the conversion currency's current value was referenced. */
    last_updated: string = null;
    /**Market cap in the specified currency. */
    market_cap = 0;
    /**Market cap dominance in the specified currency. */
    market_cap_dominance = 0;
    /**1 hour change in the specified currency. */
    percent_change_1h = 0;
    /**24 hour change in the specified currency. */
    percent_change_24h = 0;
    /**7 day change in the specified currency. */
    percent_change_7d = 0;
    /**Price in the specified currency for this historical. */
    price = 0;
    /**Rolling 24 hour adjusted volume in the specified currency. */
    volume_24h = 0;
    /**24 hour change in the specified currencies volume. */
    volume_change_24h = 0;
}
