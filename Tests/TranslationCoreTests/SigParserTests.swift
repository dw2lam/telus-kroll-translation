import Testing
@testable import TranslationCore

struct SigParserTests {
    let parser = SigParser(vocabulary: try! Vocabulary.seed())

    @Test func figmaDemoSig() {
        let p = parser.parse("1 CAP QHS PRN DIZZINESS")
        #expect(p.code.key == "TAKE|CAPSULE|PO|QHS|-|PRN|DIZZINESS|-|-|-")
        #expect(p.dose == Dose("1"))
        #expect(p.coverage == 1.0)
        #expect(p.inferred == [.verb, .route])
        #expect(p.unrecognised.isEmpty)
        #expect(!p.isAmbiguous)
    }

    @Test func numberWordsBecomeTheDose() {
        let p = parser.parse("TAKE ONE CAPSULE EVERY MORNING")
        #expect(p.code.key == "TAKE|CAPSULE|PO|QAM|-|-|-|-|-|-")
        #expect(p.dose == Dose("1"))
        #expect(p.inferred == [.route])
    }

    @Test func topicalSigWithStopWord() {
        let p = parser.parse("apply sparingly to irritated skin")
        #expect(p.code.key == "APPLY|-|TOP|-|-|-|-|-|SPARINGLY|AFFECTED")
        #expect(p.dose == nil)
        #expect(p.coverage == 1.0)
        #expect(p.spans.contains { $0.component == .stop && $0.surface == "to" })
    }

    @Test func rangesAndHourPatterns() {
        let p = parser.parse("1-2 tabs po q4-6h prn pain")
        #expect(p.code.key == "TAKE|TABLET|PO|Q4-6H|-|PRN|PAIN|-|-|-")
        #expect(p.dose == Dose("1-2"))
        #expect(p.inferred == [.verb])
    }

    @Test func typosAreCorrectedOnce() {
        let p = parser.parse("1 capsul at bedtme")
        #expect(p.corrections == [Correction(from: "capsul", to: "capsule"), Correction(from: "bedtme", to: "bedtime")])
        #expect(p.code.key == "TAKE|CAPSULE|PO|QHS|-|-|-|-|-|-")
        #expect(p.spans.filter(\.corrected).count == 2)
    }

    @Test func twoFrequenciesAreAmbiguous() {
        let p = parser.parse("1 cap bid tid")
        #expect(p.ambiguities == [Ambiguity(component: .frequency, values: ["BID", "TID"])])
        #expect(p.code.frequency == nil)
    }

    @Test func twoDosesAreAmbiguous() {
        let p = parser.parse("take 1 2 capsules daily")
        #expect(p.ambiguities.contains { $0.component == .dose })
    }

    @Test func conditionalRouteUsesTheSecondPass() {
        let drops = parser.parse("1 drop od")
        #expect(drops.code.route == "OD")
        #expect(drops.code.frequency == nil)
        #expect(drops.code.verb == "INSTILL")
        let tabs = parser.parse("1 tab od")
        #expect(tabs.code.frequency == "QD")
        #expect(tabs.code.route == "PO")
    }

    @Test func pickerFormFillsAMissingForm() {
        let p = parser.parse("1 qhs", form: .capsule)
        #expect(p.code.key == "TAKE|CAPSULE|PO|QHS|-|-|-|-|-|-")
        #expect(Set(p.inferred) == [.verb, .form, .route])
        let anyForm = parser.parse("1 qhs")
        #expect(anyForm.code.form == nil)
    }

    @Test func useAsDirected() {
        let p = parser.parse("use as directed")
        #expect(p.code.key == "USE|-|-|-|-|-|-|-|DIRECTED|-")
        #expect(p.coverage == 1.0)
    }

    @Test func krollExpansionText() {
        let p = parser.parse("TAKE 1 CAPSULE ONCE A DAY")
        #expect(p.code.key == "TAKE|CAPSULE|PO|QD|-|-|-|-|-|-")
        #expect(p.dose == Dose("1"))
    }

    @Test func durationsAndEveryNHours() {
        let p = parser.parse("take 1 tablet every 5 hours for 7 days")
        #expect(p.code.key == "TAKE|TABLET|PO|Q5H|-|-|-|D7|-|-")
        #expect(p.dose == Dose("1"))
    }

    @Test func unrecognisedTokensAreKeptAndLowerCoverage() {
        let p = parser.parse("take 1 capsule daily zzzqx")
        #expect(p.unrecognised == ["zzzqx"])
        #expect(p.coverage == 0.8)
    }

    @Test func parsingIsDeterministic() {
        let a = parser.parse("1 CAP QHS PRN DIZZINESS")
        let b = parser.parse("1 CAP QHS PRN DIZZINESS")
        #expect(a == b)
    }

    @Test func normalizedTextRoundTrip() {
        let p = parser.parse("Take  1 tab. P.O. BID w/ food")
        #expect(p.normalizedText == "take 1 tab po bid w food")
        #expect(p.code.timing == nil)
        #expect(p.unrecognised == ["w", "food"])
    }
}
