import TrackInteractionProcessor from "../ui/coinalert/interactionProcessor";
import {CoinAlerts} from "../utils/database";

describe("test alert wizard", () => {
    it("validates threshold correctly", async () => {
        try {
            TrackInteractionProcessor.validateWhen("1000000001");
            fail();
        } catch (e) {
            expect(e).toMatch("Error: The threshold you specified was too high");
        }
        try {
            TrackInteractionProcessor.validateWhen("-00000000000");
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
            await TrackInteractionProcessor.validateAlert({
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
            await TrackInteractionProcessor.validateAlert({
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