import Testing
@testable import TranslationCore

struct NormalizerTests {
    let n = Normalizer()

    @Test func lowercasesAndCollapses() {
        #expect(n.tokens("  TAKE   1 Capsule\tONCE A DAY ") == ["take", "1", "capsule", "once", "a", "day"])
    }

    @Test func abbreviationPeriodsVanishButDecimalsStay() {
        #expect(n.tokens("1 tab p.o. q.h.s.") == ["1", "tab", "po", "qhs"])
        #expect(n.tokens("0.5 ml") == ["0.5", "ml"])
        #expect(n.tokens("tabs.") == ["tabs"])
    }

    @Test func keepsRangesAndFractionsInsideTokens() {
        #expect(n.tokens("1-2 tabs, 1/2 tab; q4-6h") == ["1-2", "tabs", "1/2", "tab", "q4-6h"])
        #expect(n.tokens("- 1 tab -") == ["1", "tab"])
    }

    @Test func keepsKrollCodeStar() {
        #expect(n.tokens("*1C") == ["*1c"])
    }

    @Test func nfcNormalises() {
        let decomposed = "क\u{093C}" // क + nukta
        let precomposed = "\u{0958}"
        #expect(n.text(decomposed) == n.text(precomposed))
    }

    @Test func numerals() {
        for good in ["1", "12", "0.5", "1/2", "1-2", "1.5-2"] { #expect(Numeral.isNumeral(good), "\(good)") }
        for bad in ["6h", "", ".5", "1.", "1--2", "a", "٣", "1/2/3"] { #expect(!Numeral.isNumeral(bad), "\(bad)") }
    }
}
