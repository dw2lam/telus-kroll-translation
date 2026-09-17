import Testing
@testable import TranslationCore

struct SeedDataTests {
    @Test func seedsAreReachable() throws {
        for name in SeedData.names {
            #expect(try SeedData.url(for: name).lastPathComponent == "\(name).json")
        }
    }

    @Test func missingSeedThrows() {
        #expect(throws: SeedData.Error.missing("nope")) {
            try SeedData.url(for: "nope")
        }
    }

    @Test func templatesOnlyUseCodesTheSheetCanProduce() throws {
        let vocabulary = try Vocabulary.seed()
        let library = try TemplateLibrary.seed()
        for t in library.templates {
            for component in t.sigCode.populated {
                guard let value = t.sigCode[component] else { continue }
                let vc = VocabularyComponent(rawValue: component.rawValue)!
                #expect(vocabulary.values(for: vc).contains(value), "\(t.id): \(component) \(value) is not in the recognition sheet")
            }
        }
    }

    @Test func verifiedRowsCarryAccountability() throws {
        let library = try TemplateLibrary.seed()
        for t in library.templates {
            for tr in t.translations where tr.status == .verified {
                #expect(tr.translator != nil && tr.reviewer != nil && tr.verifiedAt != nil, "\(t.id) \(tr.language)")
                #expect(library.history(templateID: t.id, language: tr.language).count == 1)
            }
        }
    }
}
