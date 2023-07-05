import {APIChannel} from "discord-api-types/v10";
import nock from "nock";
import {DmCoinAlerts} from "../src/utils/database";
import {notifyExpiredCoins} from "../src/services/alertChecker";
import {validCryptos} from "../src/utils/coinUtils";

describe("Checks if expired coins are handled properly", function () {

    it("Alerts user if they have an alert for an expired coin", async function () {
        const alert = {
            user: "1234567890",
            coin: 1,
            stat: "price",
            threshold: "50",
            direction: ">",
            disabled: false
        };
        await DmCoinAlerts.insertOne(alert);
        expect((await DmCoinAlerts.findOne({user: "1234567890"})).threshold).toBe("50");
        nock("https://discord.com")
            .get("/api/v10/users/@me/channels")
            .reply(200, {
                id: "123123123"
            } as APIChannel);
        nock("https://discord.com")
            .post("/api/v10/channels/ok/messages")
            .reply(function (uri, requestBody) {
                expect(JSON.parse(requestBody as string).embeds[0].description).toMatch(new RegExp("The following alert has expired:\\n\\n- When price of Bitcoin is less than \\$50\\n\\nThe above coins are no longer"));
                return [200, {id: "ok"}];
            });
        nock("https://discord.com")
            .get("/api/v10/users/@me/channels")
            .reply(404, {
                id: "123123123"
            } as APIChannel);
        validCryptos.length = 0;
        await notifyExpiredCoins();
    });
});
