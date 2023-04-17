import {CronJob} from "cron";

describe("Tests cron functions", () => {
    it("sets running to true when cron is started", () => {
        const cron = new CronJob("1 1 1 1 0", () => {
        }, null, false, "UTC");
        expect(cron.running).toBeFalsy();
        cron.start();
        expect(cron.running).toBeTruthy();
        cron.stop();
        expect(cron.running).toBeFalsy();
    });
});