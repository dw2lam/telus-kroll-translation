import Testing
@testable import TranslationCore

struct LabelRendererTests {
    let library = try! TemplateLibrary.seed()
    let renderer = LabelRenderer()

    @Test func substitutesTheDoseInBothLanguages() throws {
        let t = library.template(id: "bid.capsule")!
        let label = try #require(renderer.render(template: t, dose: Dose("2"), language: .hi))
        #expect(label.english == "Take 2 capsules by mouth twice daily")
        #expect(label.supplementary == "दिन में दो बार 2 कैप्सूल मुँह से लें")
        #expect(label.isPrintable && !label.needsDose && !label.isRTL)
        let one = try #require(renderer.render(template: t, dose: Dose("1"), language: .hi))
        #expect(one.english == "Take 1 capsule by mouth twice daily")
    }

    @Test func pendingIsNeverRendered() {
        #expect(renderer.render(template: library.template(id: "qid.capsule")!, dose: Dose("1"), language: .hi) == nil)
        #expect(renderer.render(template: library.template(id: "bid.tablet")!, dose: Dose("1"), language: .zhHant) == nil)
    }

    @Test func rtlNumeralsAreIsolated() throws {
        var lib = library
        try lib.markVerified(templateID: "qd.capsule", language: .ar, reviewer: "N. Salem")
        let t = lib.template(id: "qd.capsule")!
        let label = try #require(renderer.render(template: t, dose: Dose("2"), language: .ar))
        #expect(label.isRTL)
        #expect(label.supplementary?.contains("\u{2068}2\u{2069}") == true)
        #expect(label.supplementary?.contains(where: { $0.isForeignDecimalDigit }) == false)
        #expect(label.english.contains("\u{2068}") == false)
    }

    @Test func missingDoseBlocksPrinting() {
        let t = library.template(id: "bid.capsule")!
        let label = renderer.render(template: t, dose: nil, language: .hi)!
        #expect(label.needsDose && !label.isPrintable)
        #expect(label.supplementary?.contains("[N]") == true)
        let ud = renderer.render(template: library.template(id: "ud.any")!, dose: nil, language: .hi)!
        #expect(ud.isPrintable && !ud.needsDose)
        #expect(ud.supplementary == "निर्देशानुसार लें")
    }

    @Test func englishOnlyLeavesTheKrollLabelAlone() {
        let t = library.template(id: "qd.capsule")!
        let label = renderer.englishOnly(template: t, dose: Dose("1"))
        #expect(label.supplementary == nil && label.language == .en)
        #expect(label.english == "Take 1 capsule by mouth once daily")
        #expect(renderer.render(template: t, dose: Dose("1"), language: .en)?.supplementary == nil)
    }

    @Test func nonNumericDoseIsNotSubstituted() {
        #expect(LabelRenderer.substitute("Take [N]", dose: Dose("x"), isRTL: false, plural: true) == "Take [N]")
        #expect(LabelRenderer.substitute("Take [N] tablet(s)", dose: Dose("1/2"), isRTL: false, plural: true) == "Take 1/2 tablets")
    }
}
