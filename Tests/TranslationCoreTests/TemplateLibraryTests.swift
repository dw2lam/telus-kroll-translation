import Foundation
import Testing
@testable import TranslationCore

struct TemplateLibraryTests {
    let library = try! TemplateLibrary.seed()
    let glossary = try! Glossary.seed()

    @Test func seedLoadsAndValidates() {
        #expect(library.templates.count == 14)
        #expect(library.validate().isEmpty, "\(library.validate())")
    }

    @Test func onlyHindiIsLaunched() {
        #expect(library.launchedLanguages() == [.hi])
        #expect(!library.isLaunched(.tl))
        #expect(!library.isLaunched(.ar))
        #expect(!library.isLaunched(.zhHant))
    }

    @Test func pendingIsNeverServed() {
        let servable = library.servable(language: .hi).map(\.id)
        #expect(servable.count == 11)
        #expect(!servable.contains("qid.capsule"))
        #expect(library.servable(language: .zhHant).isEmpty)
        #expect(library.servable(language: .ar).isEmpty)
        #expect(library.template(id: "qid.capsule")?.verifiedTranslation(for: .hi) == nil)
    }

    @Test func supportedFiltersByForm() {
        #expect(library.supported(form: .tablet, language: .hi).map(\.id) == ["ud.any"])
        #expect(library.supported(form: .capsule, language: .hi).count == 11 - 1)  // everything Hindi except aa.topical
        #expect(library.supported(form: .any, language: .hi).count == 11)
    }

    @Test func krollCodesResolve() {
        let star = library.resolve(krollCode: "*1c")
        #expect(star.count == 1)
        #expect(star.first?.template.id == "qd.capsule")
        #expect(star.first?.alias.impliedDose == "1")
        #expect(library.resolve(krollCode: "BID").map(\.template.id).sorted() == ["bid.capsule", "bid.tablet"])
        #expect(library.resolve(krollCode: "QHS PRN").first?.template.id == "qhs-prn.capsule")
        #expect(library.resolve(krollCode: "nope").isEmpty)
    }

    @Test func tupleLookup() {
        let code = SigCode(verb: "TAKE", form: "CAPSULE", route: "PO", frequency: "QHS", prn: true)
        #expect(library.template(sigCode: code, form: .capsule)?.id == "qhs-prn.capsule")
        #expect(library.template(sigCode: code, form: .tablet) == nil)
    }

    @Test func upsertBumpsRevisionAndRecordsHistory() throws {
        var lib = library
        let before = lib.history(templateID: "qd.capsule", language: .hi).count
        let edited = Translation(language: .hi, text: "दिन में एक बार [N] कैप्सूल मुँह से लें।", status: .pending, translator: "R. Mehta")
        let stored = try lib.upsert(edited, templateID: "qd.capsule", note: "punctuation")
        #expect(stored.revision == 2)
        #expect(lib.template(id: "qd.capsule")?.translation(for: .hi)?.status == .pending)
        #expect(lib.history(templateID: "qd.capsule", language: .hi).count == before + 1)
        #expect(lib.history(templateID: "qd.capsule", language: .hi).last?.note == "punctuation")
        #expect(!lib.servable(language: .hi).contains { $0.id == "qd.capsule" })
    }

    @Test func markVerifiedNeedsAReviewer() throws {
        var lib = library
        #expect(throws: LibraryError.missingReviewer) {
            try lib.markVerified(templateID: "qid.capsule", language: .hi, reviewer: "  ")
        }
        let verified = try lib.markVerified(templateID: "qid.capsule", language: .hi, reviewer: "A. Joshi", glossary: glossary)
        #expect(verified.status == .verified)
        #expect(verified.revision == 2)
        #expect(lib.servable(language: .hi).contains { $0.id == "qid.capsule" })
        #expect(throws: LibraryError.unknownTemplate("x")) {
            try lib.markVerified(templateID: "x", language: .hi, reviewer: "A")
        }
    }

    @Test func markVerifiedRunsQA() throws {
        var lib = library
        try lib.upsert(Translation(language: .hi, text: "गलत [N] अनुवाद", status: .pending, translator: "R. Mehta"), templateID: "bid.capsule")
        #expect(throws: LibraryError.self) {
            try lib.markVerified(templateID: "bid.capsule", language: .hi, reviewer: "A. Joshi", glossary: glossary)
        }
        try lib.markVerified(templateID: "bid.capsule", language: .hi, reviewer: "A. Joshi", glossary: glossary, overrideQA: true)
        #expect(lib.template(id: "bid.capsule")?.translation(for: .hi)?.status == .verified)
    }

    @Test func saveAndLoadRoundTrip() throws {
        let dir = FileManager.default.temporaryDirectory.appendingPathComponent("kl-\(UUID().uuidString)")
        try library.save(to: dir)
        let back = try TemplateLibrary.load(from: dir)
        #expect(back == library)
        try? FileManager.default.removeItem(at: dir)
    }

    @Test func csvRoundTrip() throws {
        let back = try TemplateLibrary.fromCSV(library.csv(), keepingHistory: library.history)
        #expect(back.templates.map(\.id) == library.templates.map(\.id))
        for (a, b) in zip(back.templates, library.templates) {
            #expect(a.sigCode == b.sigCode)
            #expect(a.krollCodes == b.krollCodes)
            #expect(a.english == b.english)
            #expect(a.translations.map(\.text) == b.translations.map(\.text))
            #expect(a.translations.map(\.status) == b.translations.map(\.status))
            #expect(a.translations.map(\.verifiedAt) == b.translations.map(\.verifiedAt))
        }
    }
}
