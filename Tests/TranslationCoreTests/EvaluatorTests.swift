import Testing
@testable import TranslationCore

struct EvaluatorTests {
    let matcher = Matcher(library: try! TemplateLibrary.seed(), vocabulary: try! Vocabulary.seed(), glossary: try! Glossary.seed())

    @Test func metricsAreArithmetic() {
        let cases = [
            EvalCase(sig: "BID", language: .hi, form: .capsule, expectedTemplateID: "bid.capsule", expectedState: "exact"),
            EvalCase(sig: "1 cap daily for 7 days", language: .hi, form: .capsule, expectedTemplateID: "qd-prn.capsule"),
            EvalCase(sig: "BID", language: .tl, form: .capsule, expectedTemplateID: "bid.capsule", expectedState: "notYetTranslatable"),
        ]
        let report = Evaluator(matcher: matcher).run(cases)
        let hi = report.perLanguage[.hi]!
        #expect(hi.cases == 2 && hi.scored == 2)
        #expect(hi.top1Hits == 1 && hi.top5Hits == 2)
        #expect(hi.top1 == 0.5 && hi.top5 == 1.0)
        #expect(hi.failures.count == 1)
        #expect(hi.failures.first?.message.contains("expected qd-prn.capsule") == true)
        #expect(report.skippedNotLaunched == 1)
        #expect(report.perLanguage[.tl]?.stateHits == 1)
        #expect(!report.meetsBar(EvalBar()))
    }

    /// The release bar: the shipped sheets must clear it before the matcher is called done.
    @Test func seedEvalSetMeetsTheBar() throws {
        let cases = try Evaluator.seedCases()
        #expect(cases.count >= 60)
        let report = Evaluator(matcher: matcher).run(cases)
        let failures = report.failures.map { "\($0.evalCase.sig) → \($0.message)" }
        #expect(report.meetsBar(EvalBar()), "\(failures.joined(separator: "\n"))")
        #expect(report.perLanguage[.hi]!.top1 >= 0.9)
        #expect(report.perLanguage[.hi]!.top5 == 1.0)
        #expect(report.perLanguage[.hi]!.stateAccuracy == 1.0)
    }
}
