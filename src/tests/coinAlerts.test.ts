import {updateCmc} from "../services/cmcApi";
import nock from "nock";
import {CoinAlertModel} from "../structs/coinAlert";
import {btcEthApiData} from "./testSetup";

describe("Tests coin alerts", () => {
    it("alerts user when coin price is below threshold", async () => {
        await new CoinAlertModel({
            user: "123",
            coin: 1,
            stat: "price",
            threshold: 100,
            direction: ">",
            disabled: false
        }).save();
        expect((await CoinAlertModel.findOne({coin: 1})).user).toBe("123");
        nock("https://pro-api.coinmarketcap.com")
            .get("/v1/cryptocurrency/listings/latest?limit=200")
            .reply(200, btcEthApiData);
        nock("https://discord.com")
            .get("/api/v10/users/@me/channels")
            .reply(200, {id: "ok"});
        await updateCmc();
        nock("https://discord.com")
            .post("/api/v10/channels/ok/messages")
            .reply(function (uri, requestBody) {
                expect(JSON.parse(requestBody as string).embeds[0].description).toMatch(new RegExp("The following alert has been triggered:\\n\\n- When price of Bitcoin is greater than \\$100"));
                return [200, {id: "ok"}];
            });
    });
});