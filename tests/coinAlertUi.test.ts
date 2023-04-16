import {CoinAlerts} from "../src/utils/database";
import {validateWhen} from "../src/utils/utils";
import {validateAlert} from "../src/utils/alertUtils";

describe("test alert wizard", () => {
    it("validates threshold correctly", async () => {
        try {
            validateWhen("1000000001");
            fail();
        } catch (e) {
            expect(e).toMatch("Error: The threshold you specified was too high");
        }
        try {
            validateWhen("-00000000000");
            fail();
        } catch (e) {
            expect(e).toMatch("The threshold you specified was too long");
        }
    });

    it("rejects duplicate/>25 alerts", async () => {
        await CoinAlerts.insertOne({
            coin: 0,
            stat: "price",
            direction: ">",
            threshold: 1,
            user: "123",
            disabled: false
        });
        try {
            await validateAlert({
                coin: 0,
                stat: "price",
                direction: ">",
                threshold: 1,
                user: "123",
                disabled: false
            });
            fail();
        } catch (e) {
            expect(e).toMatch("Error: You already have an alert exactly like the one you are trying to add");
        }
        for (let i = 1; i < 25; i++) {
            await CoinAlerts.insertOne({
                coin: i,
                stat: "price",
                direction: ">",
                threshold: 1,
                user: "123",
                disabled: false
            });
        }
        try {
            await validateAlert({
                coin: 25,
                stat: "price",
                direction: ">",
                threshold: 1,
                user: "123",
                disabled: false
            });
            fail();
        } catch (e) {
            expect(e).toMatch("Error: You can not have more than 25 alerts set");
        }
    });
});