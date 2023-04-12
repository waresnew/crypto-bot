import {gasPrices} from "../services/etherscanRest";
import {checkGasAlert} from "../utils/alertUtils";

describe("test gas alerts", () => {
    it("alerts if gas is low enough", async () => {
        gasPrices["fast"] = 2;
        expect(checkGasAlert({
            speed: "fast",
            user: "123",
            disabled: false,
            threshold: 1
        })).toBe(false);
        expect(checkGasAlert({
            speed: "fast",
            user: "123",
            disabled: false,
            threshold: 2
        })).toBe(true);
        expect(checkGasAlert({
            speed: "fast",
            threshold: 3,
            user: "123",
            disabled: false
        })).toBe(true);
    });
});