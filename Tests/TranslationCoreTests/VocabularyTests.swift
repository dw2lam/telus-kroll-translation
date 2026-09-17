import Testing
@testable import TranslationCore

struct VocabularyTests {
    @Test func seedLoadsAndValidates() throws {
        let v = try Vocabulary.seed()
        #expect(v.entries.count > 250)
        #expect(v.validate().isEmpty, "\(v.validate())")
    }

    @Test func csvRoundTrip() throws {
        let v = try Vocabulary.seed()
        let back = try Vocabulary.fromCSV(v.csv())
        #expect(back == v)
    }

    @Test func duplicateRowsAreRejected() {
        let v = Vocabulary(entries: [
            VocabularyEntry(surface: "qhs", component: .frequency, value: "QHS"),
            VocabularyEntry(surface: "QHS", component: .frequency, value: "qhs"),
        ])
        #expect(v.validate().count == 1)
        #expect(v.validate().first?.row == 2)
    }

    @Test func longestMatchWinsOverStopWord() throws {
        let v = try Vocabulary.seed()
        let m = v.longestMatch(in: ["at", "bedtime"], at: 0, context: SigCode())
        #expect(m?.length == 2)
        #expect(m?.value == "QHS")
    }

    @Test func numeralPlaceholdersBind() throws {
        let v = try Vocabulary.seed()
        #expect(v.longestMatch(in: ["for", "7", "days"], at: 0, context: SigCode())?.value == "D7")
        #expect(v.longestMatch(in: ["q5h"], at: 0, context: SigCode())?.value == "Q5H")
        #expect(v.longestMatch(in: ["q6h"], at: 0, context: SigCode())?.value == "QID")
        #expect(v.longestMatch(in: ["q4-6h"], at: 0, context: SigCode())?.value == "Q4-6H")
        #expect(v.longestMatch(in: ["every", "4", "to", "6", "hours"], at: 0, context: SigCode())?.value == "Q4-6H")
        #expect(v.longestMatch(in: ["1", "to", "2"], at: 0, context: SigCode())?.value == "1-2")
        #expect(v.longestMatch(in: ["q6hx"], at: 0, context: SigCode()) == nil)
    }

    @Test func conditionalRowsNeedTheirContext() throws {
        let v = try Vocabulary.seed()
        #expect(v.longestMatch(in: ["od"], at: 0, context: SigCode())?.entry.component == .frequency)
        let drops = SigCode(form: "DROP")
        let m = v.longestMatch(in: ["od"], at: 0, context: drops)
        #expect(m?.entry.component == .route)
        #expect(m?.value == "OD")
    }

    @Test func spellingCorrectionIsBoundedAndUnambiguous() throws {
        let v = try Vocabulary.seed()
        #expect(v.correction(for: "capsul") == "capsule")
        #expect(v.correction(for: "bedtme") == "bedtime")
        #expect(v.correction(for: "tabs") == nil)
        #expect(v.correction(for: "capsule") == nil)
        #expect(v.correction(for: "q6hx") == nil)
        let two = Vocabulary(entries: [
            VocabularyEntry(surface: "cream", component: .form, value: "CREAM"),
            VocabularyEntry(surface: "creams", component: .form, value: "CREAM"),
        ])
        #expect(two.correction(for: "creamz") == nil)
    }

    @Test func addRejectsDuplicatesAndKeepsGoodRows() throws {
        var v = try Vocabulary.seed()
        let before = v.entries.count
        #expect(throws: VocabularyError.self) {
            try v.add(VocabularyEntry(surface: "qhs", component: .frequency, value: "QHS"))
        }
        try v.add(VocabularyEntry(surface: "at lights out", component: .frequency, value: "QHS"))
        #expect(v.entries.count == before + 1)
        #expect(v.longestMatch(in: ["at", "lights", "out"], at: 0, context: SigCode())?.value == "QHS")
    }

    @Test func levenshtein() {
        #expect(Levenshtein.distance("kitten", "sitting") == 3)
        #expect(Levenshtein.distance("", "abc") == 3)
        #expect(Levenshtein.distance("abc", "abc") == 0)
        #expect(Levenshtein.distance("kitten", "sitting", limit: 1) == 2)
    }
}
