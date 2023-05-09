import {scientificNotationToNumber} from "../src/utils/utils";

describe("Test precision", () => {
    test("1", () => {
        expect(scientificNotationToNumber("6.274e-7")).toBe("0.0000006274");
    });

    test("2", () => {
        expect(scientificNotationToNumber("3.455854856e-11")).toBe("0.00000000003455854856");
    });

    test("3", () => {
        expect(scientificNotationToNumber("5.5646544854e-15")).toBe("0.0000000000000055646544854");
    });

    test("4", () => {
        expect(scientificNotationToNumber("5.564654322342242423254e-30")).toBe("0.000000000000000000000000000005564654322342242423254");
    });

    test("5", () => {
        expect(scientificNotationToNumber("0.999999999999")).toBe("0.999999999999");
    });
    test("6", () => {
        expect(scientificNotationToNumber("1e15")).toBe("1000000000000000");
    });
    test("7", () => {
        expect(scientificNotationToNumber("5.564654322342242423254e30")).toBe("5564654322342242423254000000000");
    });
    test("8", () => {
        expect(scientificNotationToNumber("5.633e2")).toBe("563.3");
    });
    test("9", () => {
        expect(scientificNotationToNumber("5.633e3")).toBe("5633");
    });
    test("10", () => {
        expect(scientificNotationToNumber("1.66e5")).toBe("166000");
    });
    test("11", () => {
        expect(scientificNotationToNumber("1.66e6")).toBe("1660000");
    });
    test("12", () => {
        expect(scientificNotationToNumber("1.66e0")).toBe("1.66");
    });
    test("13", () => {
        expect(scientificNotationToNumber("1e-8")).toBe("0.00000001");
    });
});

