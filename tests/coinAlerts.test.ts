import nock from "nock";
import {triggerAlerts} from "../src/services/alertChecker";
import {Candles, CoinAlerts, LatestCoins} from "../src/utils/database";
import {checkCoinAlert} from "../src/utils/alertUtils";

describe("Tests coin alerts", () => {
    it("alerts user when threshold", async () => {
        const firstAlert = {
            user: "123",
            coin: 1,
            stat: "price",
            threshold: "100",
            direction: ">",
            disabled: false
        };
        await CoinAlerts.insertOne(firstAlert);
        await CoinAlerts.insertOne({
            user: "123",
            coin: 1,
            stat: "24h%",
            threshold: "100",
            direction: "<",
            disabled: false
        });
        expect((await CoinAlerts.findOne({coin: 1})).user).toBe("123");
        nock("https://discord.com")
            .get("/api/v10/users/@me/channels")
            .reply(200, {id: "ok"});
        await Candles.insertOne({
            base_volume: "0",
            close_time: 0,
            ignore: "0",
            open_time: 0,
            quote_volume: "0",
            taker_base_volume: "0",
            taker_quote_volume: "0",
            trades_count: 0,
            coin: 1,
            open_price: "0",
            close_price: "200",
            high_price: "0",
            low_price: "0"

        });
        await LatestCoins.insertOne({
            coin: 1,
            dayPriceChangePercent: "0",
            weekHighPrice: "0",
            weekLowPrice: "0",
            weekPriceChangePercent: "0",
            weekWeightedAvgPrice: "0"
        });
        nock("https://discord.com")
            .post("/api/v10/channels/ok/messages")
            .reply(function (uri, requestBody) {
                expect(JSON.parse(requestBody as string).embeds[0].description).toMatch(new RegExp("The following alert has been triggered:\\n\\n- When price of Bitcoin is greater than \\$100"));
                return [200, {id: "ok"}];
            });
        expect(await checkCoinAlert(firstAlert)).toBe(true);

        await triggerAlerts();
        expect(await CoinAlerts.findOne({coin: 1})).toBe(null);

    });
});