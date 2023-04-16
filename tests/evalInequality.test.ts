import {evalInequality} from "../src/utils/alertUtils";

describe("Test inequality evaluation", () => {
    it("1", () => {
        expect(evalInequality("1<2")).toBe(true);
        expect(evalInequality("0>0")).toBe(false);
        expect(evalInequality("-100000<2323")).toBe(true);
        expect(evalInequality("100000>2323")).toBe(true);
        expect(evalInequality("-20>20")).toBe(false);
    });
});