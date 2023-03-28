import {APIChannel} from "discord-api-types/v10";
import * as cmcApi from "../services/cmcApi";
import nock from "nock";
import {CoinAlertModel} from "../structs/coinAlert";
import {CmcLatestListingModel} from "../structs/cmcLatestListing";

describe("Checks if expired coins are handled properly", function () {

    it("Alerts user if they have an alert for an expired coin", async function () {

        const alert = new CoinAlertModel({
            user: "1234567890",
            coin: 1,
            stat: "price",
            threshold: 50,
            direction: ">"
        });
        await alert.save();
        expect((await CoinAlertModel.findOne({user: "1234567890"})).threshold).toBe(50);
        // eslint-disable-next-line quotes
        nock("https://pro-api.coinmarketcap.com")
            .get("/v1/cryptocurrency/listings/latest?limit=200")
            .reply(200, JSON.parse("{\"data\":[{\"id\":1027,\"name\":\"Ethereum\",\"symbol\":\"ETH\",\"cmc_rank\":\"6\",\"slug\":\"ethereum\",\"num_market_pairs\":6360,\"circulating_supply\":16950100,\"total_supply\":16950100,\"max_supply\":21000000,\"last_updated\":\"2018-06-02T22:51:28.209Z\",\"date_added\":\"2013-04-28T00:00:00.000Z\",\"tags\":[\"mineable\"],\"platform\":null,\"quote\":{\"USD\":{\"price\":1283.92,\"volume_24h\":7155680000,\"volume_change_24h\":-0.152774,\"percent_change_1h\":-0.152774,\"percent_change_24h\":0.518894,\"percent_change_7d\":0.986573,\"market_cap\":158055024432,\"market_cap_dominance\":51,\"fully_diluted_market_cap\":952835089431.14,\"last_updated\":\"2018-08-09T22:53:32.000Z\"},\"ETH\":{\"price\":1,\"volume_24h\":772012,\"volume_change_24h\":-0.152774,\"percent_change_1h\":0,\"percent_change_24h\":0,\"percent_change_7d\":0,\"market_cap\":17024600,\"market_cap_dominance\":12,\"fully_diluted_market_cap\":952835089431.14,\"last_updated\":\"2018-08-09T22:53:32.000Z\"}}}],\"status\":{\"timestamp\":\"2018-06-02T22:51:28.209Z\",\"error_code\":0,\"error_message\":\"\",\"elapsed\":10,\"credit_count\":1}}"));
        nock("https://discord.com")
            .get("/api/v10/users/@me/channels")
            .reply(200, {
                id: "123123123"
            } as APIChannel);
        nock("https://discord.com")
            .post("/api/v10/channels/ok/messages")
            .reply(function (uri, requestBody) {
                expect(JSON.parse(requestBody as string).embeds[0].description).toMatch(new RegExp("The following alert has expired:\\n\\n- When price of Bitcoin is less than \\$50\\n\\nThe above coins are no longer in the top 200 cryptocurrencies by market cap"));
                return [200, {id: "ok"}];
            });
        nock("https://discord.com")
            .get("/api/v10/users/@me/channels")
            .reply(404, {
                id: "123123123"
            } as APIChannel);
        await cmcApi.updateCmc();
        expect(await CmcLatestListingModel.findOne({id: 1})).toBeNull();
        expect(await CmcLatestListingModel.findOne({id: 1027})).not.toBeNull();
    });
});
