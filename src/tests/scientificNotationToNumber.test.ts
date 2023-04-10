import {scientificNotationToNumber} from "../utils/utils";

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
});
