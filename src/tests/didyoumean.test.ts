import didYouMean from "didyoumean";

describe("Test didyoumean settings", () => {
    it("1", () => {
        didYouMean.threshold = null;
        expect(didYouMean("BitTorrent", ["BitTorrent-New"])).toBe("BitTorrent-New");
        expect(didYouMean("ok", ["The quick brown fox jumped over the lazy dog"])).toBeNull();
        expect(didYouMean("eth", ["Ethereum"])).toBe("Ethereum");
    });
});