import Foundation

/// One held-out example: what a pharmacist typed and what the engine must do with it.
public struct EvalCase: Codable, Sendable, Hashable {
    public var sig: String
    public var language: LanguageCode
    public var form: DosageForm
    public var expectedTemplateID: String?
    public var expectedDose: String?
    /// "exact", "closest", "candidates", "refused", "notYetTranslatable", "rejected"
    public var expectedState: String?

    public init(sig: String, language: LanguageCode, form: DosageForm, expectedTemplateID: String? = nil, expectedDose: String? = nil, expectedState: String? = nil) {
        self.sig = sig
        self.language = language
        self.form = form
        self.expectedTemplateID = expectedTemplateID
        self.expectedDose = expectedDose
        self.expectedState = expectedState
    }
}

public struct EvalFailure: Codable, Sendable, Hashable {
    public var evalCase: EvalCase
    public var gotState: String
    public var gotRanked: [String]
    public var gotDose: String?
    public var message: String
}

/// The release bar the PRD asks for: a new sheet or a changed weight must clear it.
public struct EvalBar: Codable, Sendable, Hashable {
    public var top1: Double
    public var top5: Double

    public init(top1: Double = 0.90, top5: Double = 1.0) {
        self.top1 = top1
        self.top5 = top5
    }
}

public struct EvalReport: Codable, Sendable, Hashable {
    public struct LanguageMetrics: Codable, Sendable, Hashable {
        public var cases: Int
        public var scored: Int
        public var top1Hits: Int
        public var top5Hits: Int
        public var stateChecked: Int
        public var stateHits: Int
        public var failures: [EvalFailure]

        public var top1: Double { scored == 0 ? 1 : Double(top1Hits) / Double(scored) }
        public var top5: Double { scored == 0 ? 1 : Double(top5Hits) / Double(scored) }
        public var stateAccuracy: Double { stateChecked == 0 ? 1 : Double(stateHits) / Double(stateChecked) }
    }

    public var perLanguage: [LanguageCode: LanguageMetrics]
    public var skippedNotLaunched: Int

    public func meetsBar(_ bar: EvalBar) -> Bool {
        perLanguage.values.allSatisfy { $0.top1 >= bar.top1 && $0.top5 >= bar.top5 && $0.failures.isEmpty }
    }

    public var failures: [EvalFailure] { perLanguage.values.flatMap(\.failures) }
}

public struct Evaluator: Sendable {
    public var matcher: Matcher

    public init(matcher: Matcher) {
        self.matcher = matcher
    }

    public static func seedCases() throws -> [EvalCase] {
        try SeedData.load([EvalCase].self, "evalset")
    }

    static func stateKey(_ result: MatchResult) -> String {
        switch result {
        case .exact: "exact"
        case .closest: "closest"
        case .candidates: "candidates"
        case .refused: "refused"
        case .notYetTranslatable: "notYetTranslatable"
        case .rejected: "rejected"
        }
    }

    public func run(_ cases: [EvalCase]) -> EvalReport {
        var per: [LanguageCode: EvalReport.LanguageMetrics] = [:]
        var skipped = 0
        for c in cases {
            var m = per[c.language] ?? EvalReport.LanguageMetrics(cases: 0, scored: 0, top1Hits: 0, top5Hits: 0, stateChecked: 0, stateHits: 0, failures: [])
            m.cases += 1
            let output = matcher.match(c.sig, language: c.language, form: c.form)
            let state = Evaluator.stateKey(output.result)
            let ranked = output.result.ranked.map(\.id)
            let dose = output.result.best?.dose?.value
            var problems: [String] = []

            if let expectedState = c.expectedState {
                m.stateChecked += 1
                if expectedState == state { m.stateHits += 1 } else { problems.append("state \(state), expected \(expectedState)") }
            }
            if let expected = c.expectedTemplateID {
                if case .notYetTranslatable = output.result {
                    skipped += 1
                } else {
                    m.scored += 1
                    if ranked.first == expected { m.top1Hits += 1 } else { problems.append("top-1 \(ranked.first ?? "—"), expected \(expected)") }
                    if ranked.prefix(5).contains(expected) { m.top5Hits += 1 } else { problems.append("\(expected) not in top-5 \(ranked)") }
                }
            }
            if let expectedDose = c.expectedDose, dose != expectedDose {
                problems.append("dose \(dose ?? "—"), expected \(expectedDose)")
            }
            if !problems.isEmpty {
                m.failures.append(EvalFailure(evalCase: c, gotState: state, gotRanked: ranked, gotDose: dose, message: problems.joined(separator: "; ")))
            }
            per[c.language] = m
        }
        return EvalReport(perLanguage: per, skippedNotLaunched: skipped)
    }
}
