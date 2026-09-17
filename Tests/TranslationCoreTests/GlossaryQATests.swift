import Testing
@testable import TranslationCore

struct GlossaryQATests {
    let library = try! TemplateLibrary.seed()
    let glossary = try! Glossary.seed()

    @Test func everyVerifiedSeedRowPassesQA() {
        let report = LibraryQA.report(library, glossary: glossary)
        let verifiedOnly = report.filter { key, _ in
            let parts = key.split(separator: "@")
            let t = library.template(id: String(parts[0]))!
            return t.translation(for: LanguageCode(rawValue: String(parts[1]))!)?.status == .verified
        }
        #expect(verifiedOnly.isEmpty, "\(verifiedOnly)")
    }

    @Test func missingTermIsFlagged() {
        let t = library.template(id: "bid.capsule")!
        let issues = LibraryQA.check(text: "दिन में [N] कैप्सूल मुँह से लें", template: t, language: .hi, glossary: glossary)
        #expect(issues.map(\.kind) == [.missingGlossaryTerm])
        #expect(issues.first?.message.contains("दिन में दो बार") == true)
    }

    @Test func slotAndNumeralRules() {
        let t = library.template(id: "bid.capsule")!
        let noSlot = LibraryQA.check(text: "दिन में दो बार कैप्सूल मुँह से लें", template: t, language: .hi, glossary: glossary)
        #expect(noSlot.map(\.kind) == [.slotCountMismatch])
        let devanagariDigit = LibraryQA.check(text: "दिन में दो बार १ [N] कैप्सूल मुँह से लें", template: t, language: .hi, glossary: glossary)
        #expect(devanagariDigit.map(\.kind) == [.nonASCIIDigits])
        #expect(LibraryQA.check(text: "  ", template: t, language: .hi, glossary: glossary).map(\.kind) == [.emptyText])
    }

    @Test func glossaryCSVRoundTrip() throws {
        #expect(try Glossary.fromCSV(glossary.csv()) == glossary)
        #expect(glossary.term(.frequency, "bid", in: .hi) == "दिन में दो बार")
        #expect(glossary.term(.frequency, "BID", in: .tl) == nil)
    }
}
