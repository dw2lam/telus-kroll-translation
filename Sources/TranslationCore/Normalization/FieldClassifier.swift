import Foundation

/// Keeps drug names out of the engine. The PRD is explicit: only dosing,
/// frequency and route text may reach matching. A field that looks like a
/// product name with a strength, or a bare drug-name suffix, is rejected.
public struct FieldClassifier: Sendable {
    public enum Verdict: Sendable, Equatable {
        case sig
        case drugName
        case empty
    }

    static let strengthUnits: Set<String> = ["mg", "mcg", "g", "ml", "iu", "unit", "units", "%", "mmol"]
    static let drugSuffixes = [
        "cillin", "statin", "prazole", "olol", "pril", "sartan", "mycin", "cycline", "azole",
        "dipine", "floxacin", "tidine", "vir", "mab", "formin", "zepam", "zolam", "afil", "triptan",
        "oxetine", "pramine", "profen", "coxib", "gliptin", "glitazone", "lukast", "terol", "asone", "solone",
    ]

    public init() {}

    public func classify(_ raw: String, parsed: ParsedSig) -> Verdict {
        let tokens = parsed.tokens
        guard !tokens.isEmpty else { return .empty }
        let understood = parsed.code.verb != nil || parsed.code.frequency != nil || parsed.code.form != nil || parsed.dose != nil
        if understood, parsed.coverage >= 0.5 { return .sig }
        if tokens.contains(where: FieldClassifier.looksLikeStrength) { return .drugName }
        for (a, b) in zip(tokens, tokens.dropFirst()) where Numeral.isNumeral(a) && FieldClassifier.strengthUnits.contains(b) {
            return .drugName
        }
        if tokens.contains(where: FieldClassifier.hasDrugSuffix) { return .drugName }
        return .sig
    }

    /// `300mg`, `0.5mg`, `5%`, `200mcg`
    static func looksLikeStrength(_ token: String) -> Bool {
        let digits = token.prefix { $0.isASCIIDigit || $0 == "." }
        guard !digits.isEmpty else { return false }
        let unit = String(token.dropFirst(digits.count))
        return strengthUnits.contains(unit)
    }

    static func hasDrugSuffix(_ token: String) -> Bool {
        token.count >= 6 && drugSuffixes.contains { token.hasSuffix($0) }
    }
}
