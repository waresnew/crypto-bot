import {DmCoinAlerts} from "../src/utils/database";
import {validateWhen} from "../src/utils/utils";
import {validateAlert} from "../src/utils/alertUtils";
import {UserError} from "../src/structs/userError";

describe("test alert wizard", () => {
    it("validates threshold correctly", async () => {
        try {
            validateWhen("-000000000000000000000000000000000000000000000");
            fail();
        } catch (e) {
            expect((e as UserError).error).toMatch("The threshold you specified was too long");
        }
    });

    it("rejects duplicate/>10 alerts", async () => {
        await DmCoinAlerts.insertOne({
            coin: 0,
            stat: "price",
            direction: ">",
            threshold: "1",
            user: "123",
            disabled: false
        });
        try {
            await validateAlert({
                coin: 0,
                stat: "price",
                direction: ">",
                threshold: "1",
                user: "123",
                disabled: false
            });
            fail();
        } catch (e) {
            expect((e as UserError).error).toMatch("Error: You already have an alert exactly like the one you are trying to add");
        }
        for (let i = 1; i < 10; i++) {
            await DmCoinAlerts.insertOne({
                coin: i,
                stat: "price",
                direction: ">",
                threshold: "1",
                user: "123",
                disabled: false
            });
        }
        try {
            await validateAlert({
                coin: 10,
                stat: "price",
                direction: ">",
                threshold: "1",
                user: "123",
                disabled: false
            });
            fail();
        } catch (e) {
            expect((e as UserError).error).toMatch("Error: You can not have more than 25 alerts set");
        }
    });
});