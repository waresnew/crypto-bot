import {DmCoinAlerts} from "../src/utils/database";
import {validateWhen} from "../src/utils/utils";
import {validateAlert} from "../src/utils/alertUtils";
import {UserError} from "../src/structs/userError";
import {DmCoinAlert} from "../src/structs/alert/dmCoinAlert";

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
            disabled: false,
            message: null
        });
        try {
            const a = new DmCoinAlert();
            a.coin = 0;
            a.stat = "price";
            a.direction = ">";
            a.threshold = "1";
            a.user = "123";
            a.disabled = false;
            await validateAlert(a);
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
                disabled: false,
                message: null
            });
        }
        try {
            const a = new DmCoinAlert();
            a.coin = 10;
            a.stat = "price";
            a.direction = ">";
            a.threshold = "1";
            a.user = "123";
            a.disabled = false;

            await validateAlert(a);
            fail();
        } catch (e) {
            expect((e as UserError).error).toMatch("Error: You can not have more than 10 alerts set");
        }
    });
});