import Foundation

/// Sig → state. Pure and synchronous: the same input against the same sheets
/// always gives the same answer, and every answer says why.
public struct Matcher: Sendable {
    public var library: TemplateLibrary
    public var vocabulary: Vocabulary
    public var glossary: Glossary
    public var configuration: MatcherConfiguration
    public var parser: SigParser
    public var classifier: FieldClassifier

    public init(library: TemplateLibrary, vocabulary: Vocabulary, glossary: Glossary, configuration: MatcherConfiguration = MatcherConfiguration()) {
        self.library = library
        self.vocabulary = vocabulary
        self.glossary = glossary
        self.configuration = configuration
        self.parser = SigParser(vocabulary: vocabulary)
        self.classifier = FieldClassifier()
    }

    public func match(_ raw: String, language: LanguageCode, form: DosageForm) -> MatchOutput {
        let tokens = parser.normalizer.tokens(raw)
        guard !tokens.isEmpty else {
            return MatchOutput(parsed: nil, result: .rejected(.empty), guide: [])
        }
        guard library.isLaunched(language) else {
            return MatchOutput(parsed: nil, result: .notYetTranslatable(language: language), guide: [])
        }

        // 1. A Kroll sig code, optionally led by a dose ("2 BID").
        if let hit = krollCodeMatch(tokens: tokens, language: language, form: form) {
            return MatchOutput(parsed: nil, result: hit, guide: phrasingGuide(language: language, form: form, parsed: nil))
        }

        // 2. Free text.
        let parsed = parser.parse(raw, form: form)
        let guide = phrasingGuide(language: language, form: form, parsed: parsed)
        switch classifier.classify(raw, parsed: parsed) {
        case .empty: return MatchOutput(parsed: parsed, result: .rejected(.empty), guide: guide)
        case .drugName: return MatchOutput(parsed: parsed, result: .rejected(.looksLikeDrugName), guide: guide)
        case .sig: break
        }
        if parsed.code.isEmpty {
            return MatchOutput(parsed: parsed, result: .refused(.nothingRecognised), guide: guide)
        }
        if parsed.isAmbiguous {
            return MatchOutput(parsed: parsed, result: .refused(.ambiguous(parsed.ambiguities)), guide: guide)
        }

        // 3. Arithmetic on tuples.
        let (pool, relaxed) = pool(language: language, form: form, verb: parsed.code.verb)
        let scored = pool
            .map { score($0, against: parsed, relaxed: relaxed) }
            .sorted { ($0.distance, $0.id) < ($1.distance, $1.id) }
        guard let best = scored.first else {
            return MatchOutput(parsed: parsed, result: .refused(.noCloseTemplate(best: nil)), guide: guide)
        }
        let shown = Array(scored.filter { $0.distance <= configuration.candidateMaxDistance }.prefix(configuration.topK))
        if best.distance == 0 {
            return MatchOutput(parsed: parsed, result: .exact(best, via: .sigCode), guide: guide)
        }
        if best.distance <= configuration.closestMaxDistance {
            return MatchOutput(parsed: parsed, result: .closest(best, runnersUp: Array(shown.dropFirst())), guide: guide)
        }
        if shown.isEmpty {
            return MatchOutput(parsed: parsed, result: .refused(.noCloseTemplate(best: best.distance)), guide: guide)
        }
        return MatchOutput(parsed: parsed, result: .candidates(shown), guide: guide)
    }

    // MARK: Pieces

    func krollCodeMatch(tokens: [String], language: LanguageCode, form: DosageForm) -> MatchResult? {
        var dose: Dose?
        var codeTokens = tokens
        if codeTokens.count > 1, Numeral.isNumeral(codeTokens[0]) {
            dose = Dose(codeTokens[0])
            codeTokens.removeFirst()
        }
        let code = codeTokens.joined(separator: " ").uppercased()
        let hits = library.resolve(krollCode: code).filter { form.accepts($0.template.form) && $0.template.isServable(in: language) }
        guard !hits.isEmpty else { return nil }
        let candidates = hits.map { hit in
            ScoredCandidate(
                template: hit.template,
                dose: dose ?? hit.alias.impliedDose.map(Dose.init),
                distance: 0, confidence: 1, diff: [], coverage: 1, prefilterRelaxed: false
            )
        }.sorted { $0.id < $1.id }
        if candidates.count == 1 || form != .any {
            let chosen = candidates.first { $0.template.form == form } ?? candidates[0]
            return .exact(chosen, via: .krollCode(code))
        }
        return .candidates(candidates)
    }

    /// Verified templates for this language and form, narrowed to the parsed
    /// verb when that leaves anything. Widened step by step if it does not.
    func pool(language: LanguageCode, form: DosageForm, verb: String?) -> ([Template], Bool) {
        let servable = library.servable(language: language)
        let byForm = servable.filter { form.accepts($0.form) }
        if let verb {
            let byVerb = byForm.filter { $0.sigCode.verb == verb }
            if !byVerb.isEmpty { return (byVerb, false) }
        }
        if !byForm.isEmpty { return (byForm, verb != nil) }
        return (servable, true)
    }

    func score(_ template: Template, against parsed: ParsedSig, relaxed: Bool) -> ScoredCandidate {
        let diff = parsed.code.diff(template.sigCode, weights: configuration.weights)
        let distance = diff.reduce(0) { $0 + $1.cost }
        let closeness = max(0, 1 - Double(distance) / Double(configuration.weights.maximum))
        let confidence = closeness * (0.5 + 0.5 * parsed.coverage)
        return ScoredCandidate(
            template: template,
            dose: parsed.dose,
            distance: distance,
            confidence: (confidence * 1000).rounded() / 1000,
            diff: diff,
            coverage: parsed.coverage,
            prefilterRelaxed: relaxed
        )
    }

    /// State 4: what the pharmacist could reword to. Same verb and form when
    /// that leaves anything; otherwise everything verified for the form.
    public func phrasingGuide(language: LanguageCode, form: DosageForm, parsed: ParsedSig?) -> [Template] {
        let supported = library.supported(form: form, language: language)
        if let verb = parsed?.code.verb {
            let sameVerb = supported.filter { $0.sigCode.verb == verb }
            if !sameVerb.isEmpty { return sameVerb }
        }
        return supported.isEmpty ? library.servable(language: language) : supported
    }

    /// State 5, stated plainly. No referral to anyone — the PRD found no one to refer to.
    public func refusalText(_ reason: RefusalReason, language: LanguageCode) -> String {
        let why: String = switch reason {
        case .nothingRecognised:
            "None of it matched the recognition sheet."
        case .ambiguous(let list):
            "It gives more than one " + list.map { "\($0.component.displayName) (\($0.values.joined(separator: ", ")))" }.joined(separator: " and ") + "."
        case .noCloseTemplate:
            "No verified \(language.displayName) sig code is close enough to it."
        }
        return "This sig can’t be translated into \(language.displayName). \(why) The vial label will print in English only."
    }

    /// State 5 when the pharmacist rejects the phrasing guide.
    public func refusalText(language: LanguageCode) -> String {
        "This sig can’t be translated into \(language.displayName). No verified \(language.displayName) sig code represents it. The vial label will print in English only."
    }
}
