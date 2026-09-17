import Foundation

/// Turns whatever a pharmacist typed into a stable token stream. Deterministic
/// and table-free: NFC, lowercase, punctuation to spaces — except periods
/// between digits (`0.5`) and hyphens/slashes joining alphanumerics
/// (`1-2`, `1/2`, `q4-6h`). Abbreviation periods vanish (`p.o.` → `po`).
public struct Normalizer: Sendable {
    public init() {}

    public func tokens(_ raw: String) -> [String] {
        let chars = Array(raw.precomposedStringWithCanonicalMapping.lowercased())
        var out = ""
        out.reserveCapacity(chars.count)
        for (i, c) in chars.enumerated() {
            let prev: Character = i > 0 ? chars[i - 1] : " "
            let next: Character = i + 1 < chars.count ? chars[i + 1] : " "
            switch c {
            case ".":
                if prev.isASCIIDigit, next.isASCIIDigit { out.append(c) }
            case "-", "/":
                if prev.isTokenCharacter, next.isTokenCharacter { out.append(c) } else { out.append(" ") }
            case "*", "#":
                // `*` starts Kroll codes; `#` is the sheet's numeral placeholder.
                out.append(c)
            default:
                out.append(c.isAlphanumeric ? c : " ")
            }
        }
        return out.split(separator: " ").map(String.init)
    }

    public func text(_ raw: String) -> String {
        tokens(raw).joined(separator: " ")
    }
}

/// Numeric-shaped tokens: `1`, `0.5`, `1/2`, `1-2`. Only ASCII digits count —
/// the label rule is 0–9 everywhere, so the parser never accepts other numerals.
public enum Numeral {
    public static func isNumeral(_ token: String) -> Bool {
        if let sep = token.firstIndex(where: { $0 == "-" || $0 == "/" }) {
            return isSimple(token[..<sep]) && isSimple(token[token.index(after: sep)...])
        }
        return isSimple(token[...])
    }

    public static func parse(_ token: String) -> String? {
        isNumeral(token) ? token : nil
    }

    static func isSimple(_ s: Substring) -> Bool {
        guard !s.isEmpty else { return false }
        let parts = s.split(separator: ".", omittingEmptySubsequences: false)
        guard parts.count <= 2 else { return false }
        return parts.allSatisfy { !$0.isEmpty && $0.allSatisfy(\.isASCIIDigit) }
    }
}

extension Character {
    var isASCIIDigit: Bool { isASCII && isNumber }

    /// A decimal digit from another numeral system (१, ٣, ９). Number words such
    /// as 一 or 兩 are not digits and are fine on a label.
    var isForeignDecimalDigit: Bool {
        !isASCII && unicodeScalars.contains { $0.properties.numericType == .decimal }
    }
    var isAlphanumeric: Bool { isLetter || isASCIIDigit }
    var isTokenCharacter: Bool { isAlphanumeric || self == "#" }
}
