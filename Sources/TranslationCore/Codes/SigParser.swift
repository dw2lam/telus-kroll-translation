import Foundation

public struct Dose: Codable, Sendable, Hashable {
    public var value: String

    public init(_ value: String) { self.value = value }
}

public struct RecognisedSpan: Codable, Sendable, Hashable {
    public var surface: String
    public var component: VocabularyComponent
    public var value: String
    public var range: Range<Int>
    public var corrected: Bool
}

public struct Ambiguity: Codable, Sendable, Hashable {
    public var component: VocabularyComponent
    public var values: [String]
}

public struct Correction: Codable, Sendable, Hashable {
    public var from: String
    public var to: String
}

/// Everything the parser understood about a sig — and everything it did not.
public struct ParsedSig: Codable, Sendable, Hashable {
    public var raw: String
    public var tokens: [String]
    public var code: SigCode
    public var dose: Dose?
    public var spans: [RecognisedSpan]
    public var unrecognised: [String]
    public var ambiguities: [Ambiguity]
    public var inferred: [SigComponent]
    public var corrections: [Correction]

    public var normalizedText: String { tokens.joined(separator: " ") }
    public var isAmbiguous: Bool { !ambiguities.isEmpty }

    /// Recognised, non-stop tokens over all non-stop tokens.
    public var coverage: Double {
        let stops = spans.filter { $0.component == .stop }.reduce(0) { $0 + $1.range.count }
        let denominator = tokens.count - stops
        guard denominator > 0 else { return 0 }
        return Double(denominator - unrecognised.count) / Double(denominator)
    }
}

/// Deterministic sig → `SigCode`. Greedy longest-match over the recognition
/// sheet (two passes so conditional rows can see what the first pass found),
/// one round of unambiguous spell-correction, then a small inference table for
/// what pharmacists leave implicit (`1 cap bid` → take … by mouth).
public struct SigParser: Sendable {
    public var vocabulary: Vocabulary
    public var normalizer: Normalizer

    public init(vocabulary: Vocabulary, normalizer: Normalizer = Normalizer()) {
        self.vocabulary = vocabulary
        self.normalizer = normalizer
    }

    public func parse(_ raw: String, form pickerForm: DosageForm = .any) -> ParsedSig {
        var tokens = normalizer.tokens(raw)
        var corrections: [Correction] = []
        var scan = self.scan(tokens)

        let fixes = scan.unmatched.compactMap { i -> (Int, String)? in
            vocabulary.correction(for: tokens[i]).map { (i, $0) }
        }
        if !fixes.isEmpty {
            for (i, to) in fixes {
                corrections.append(Correction(from: tokens[i], to: to))
                tokens[i] = to
            }
            scan = self.scan(tokens)
        }

        var values: [VocabularyComponent: [String]] = [:]
        for span in scan.spans where span.component != .stop {
            values[span.component, default: []].append(span.value)
        }
        var unrecognised: [String] = []
        for i in scan.unmatched {
            if Numeral.isNumeral(tokens[i]) {
                values[.dose, default: []].append(tokens[i])
            } else {
                unrecognised.append(tokens[i])
            }
        }

        var code = SigCode()
        var ambiguities: [Ambiguity] = []
        for component in VocabularyComponent.allCases {
            guard let found = values[component], !found.isEmpty else { continue }
            let distinct = found.reduce(into: [String]()) { if !$0.contains($1) { $0.append($1) } }
            if distinct.count > 1 {
                ambiguities.append(Ambiguity(component: component, values: distinct))
                continue
            }
            if let sig = component.sigComponent { code[sig] = distinct[0] }
        }
        let dose = values[.dose].flatMap { $0.first }.map(Dose.init)

        let inferred = SigParser.infer(&code, pickerForm: pickerForm)

        var spans = scan.spans
        let correctedIndices = Set(fixes.map(\.0))
        for i in spans.indices where spans[i].range.contains(where: correctedIndices.contains) {
            spans[i].corrected = true
        }

        return ParsedSig(
            raw: raw,
            tokens: tokens,
            code: code,
            dose: dose,
            spans: spans,
            unrecognised: unrecognised,
            ambiguities: ambiguities,
            inferred: inferred,
            corrections: corrections
        )
    }

    // MARK: Scanning

    struct Scan {
        var spans: [RecognisedSpan]
        var unmatched: [Int]
        var code: SigCode
    }

    func scan(_ tokens: [String]) -> Scan {
        let first = pass(tokens, context: SigCode())
        return pass(tokens, context: first.code)
    }

    func pass(_ tokens: [String], context: SigCode) -> Scan {
        var spans: [RecognisedSpan] = []
        var unmatched: [Int] = []
        var code = SigCode()
        var i = 0
        while i < tokens.count {
            if let match = vocabulary.longestMatch(in: tokens, at: i, context: context) {
                let range = i..<(i + match.length)
                spans.append(RecognisedSpan(
                    surface: tokens[range].joined(separator: " "),
                    component: match.entry.component,
                    value: match.value,
                    range: range,
                    corrected: false
                ))
                if let sig = match.entry.component.sigComponent, code[sig] == nil { code[sig] = match.value }
                i += match.length
            } else {
                unmatched.append(i)
                i += 1
            }
        }
        return Scan(spans: spans, unmatched: unmatched, code: code)
    }

    // MARK: Inference

    static let oralForms: Set<String> = ["CAPSULE", "TABLET", "ML", "TSP", "TBSP", "LOZENGE", "SACHET", "UNIT"]
    static let topicalForms: Set<String> = ["CREAM", "OINTMENT", "GEL", "PATCH", "LOTION"]
    static let eyeEarRoutes: Set<String> = ["OD", "OS", "OU", "AD", "AS", "AU", "NASAL"]
    static let applyModifiers: Set<String> = ["SPARINGLY", "THIN", "LIBERALLY"]

    /// Fills in what the sig left implicit. Returns the components it set.
    static func infer(_ code: inout SigCode, pickerForm: DosageForm) -> [SigComponent] {
        var inferred: [SigComponent] = []

        // The drug card already knows the form; only oral forms are implied this
        // way, and only when the sig itself said something.
        if code.form == nil, !code.isEmpty, let picked = pickerForm.formCode, code.verb == nil || code.verb == "TAKE" {
            code.form = picked
            inferred.append(.form)
        }
        let form = code.form
        let route = code.route

        if code.verb == nil {
            let verb: String? =
                if let form, oralForms.contains(form) { "TAKE" }
                else if route == "PO" || route == "SL" { "TAKE" }
                else if let form, topicalForms.contains(form) { "APPLY" }
                else if code.site != nil || route == "TOP" || applyModifiers.contains(code.modifier ?? "") { "APPLY" }
                else if form == "DROP" || form == "SPRAY" || eyeEarRoutes.contains(route ?? "") { "INSTILL" }
                else if form == "PUFF" || route == "INH" { "INHALE" }
                else if form == "SUPPOSITORY" || route == "PR" || route == "PV" { "INSERT" }
                else if code.modifier == "DIRECTED" { "USE" }
                else { nil }
            if let verb {
                code.verb = verb
                inferred.append(.verb)
            }
        }

        if code.route == nil {
            let route: String? =
                if let form = code.form, oralForms.contains(form) { "PO" }
                else if let form = code.form, topicalForms.contains(form) { "TOP" }
                else if code.verb == "APPLY" { "TOP" }
                else if code.form == "PUFF" || code.verb == "INHALE" { "INH" }
                else if code.form == "SUPPOSITORY" { "PR" }
                else { nil }
            if let route {
                code.route = route
                inferred.append(.route)
            }
        }

        return inferred
    }
}
