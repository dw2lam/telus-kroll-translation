import Foundation

/// The per-language term a translator should use for a component value, so the
/// verified sentences stay consistent. Authoring and QA only — never assembled
/// into output at runtime.
public struct GlossaryEntry: Codable, Sendable, Hashable, Identifiable {
    public var language: LanguageCode
    public var component: SigComponent
    public var value: String
    public var term: String
    public var note: String?

    public init(language: LanguageCode, component: SigComponent, value: String, term: String, note: String? = nil) {
        self.language = language
        self.component = component
        self.value = value.uppercased()
        self.term = term.precomposedStringWithCanonicalMapping
        self.note = note
    }

    public var id: String { "\(language.rawValue):\(component.rawValue):\(value)" }
}

public struct Glossary: Sendable, Equatable {
    public var entries: [GlossaryEntry]

    public init(entries: [GlossaryEntry]) {
        self.entries = entries
    }

    public static func seed() throws -> Glossary {
        Glossary(entries: try SeedData.load([GlossaryEntry].self, "glossary"))
    }

    public static func load(from url: URL) throws -> Glossary {
        Glossary(entries: try JSONCoding.read([GlossaryEntry].self, from: url))
    }

    public func save(to url: URL) throws {
        try JSONCoding.write(entries, to: url)
    }

    public func term(_ component: SigComponent, _ value: String, in language: LanguageCode) -> String? {
        let wanted = value.uppercased()
        return entries.first { $0.language == language && $0.component == component && $0.value == wanted }?.term
    }

    public func entries(for language: LanguageCode) -> [GlossaryEntry] {
        entries.filter { $0.language == language }
    }

    public static let csvHeader = ["language", "component", "value", "term", "note"]

    public func csv() -> String {
        CSV.render([Glossary.csvHeader] + entries.map { [$0.language.rawValue, $0.component.rawValue, $0.value, $0.term, $0.note ?? ""] })
    }

    public static func fromCSV(_ text: String) throws -> Glossary {
        var rows = CSV.parse(text)
        if let header = rows.first, header.map({ $0.lowercased() }) == csvHeader { rows.removeFirst() }
        var entries: [GlossaryEntry] = []
        for (n, row) in rows.enumerated() where !row.allSatisfy(\.isEmpty) {
            guard row.count >= 4, let language = LanguageCode(rawValue: row[0]), let component = SigComponent(rawValue: row[1]) else {
                throw LibraryError.malformedRow(n + 2, "expected language,component,value,term")
            }
            entries.append(GlossaryEntry(language: language, component: component, value: row[2], term: row[3], note: row.count > 4 && !row[4].isEmpty ? row[4] : nil))
        }
        return Glossary(entries: entries)
    }
}

public struct QAIssue: Codable, Sendable, Hashable {
    public enum Kind: String, Codable, Sendable {
        case missingGlossaryTerm
        case slotCountMismatch
        case nonASCIIDigits
        case emptyText
    }

    public var kind: Kind
    public var message: String
}

/// Checks a translation against the glossary and the numeral/slot rules.
public enum LibraryQA {
    public static func check(_ template: Template, language: LanguageCode, glossary: Glossary) -> [QAIssue] {
        guard let translation = template.translation(for: language) else { return [] }
        return check(text: translation.text, template: template, language: language, glossary: glossary)
    }

    public static func check(text: String, template: Template, language: LanguageCode, glossary: Glossary) -> [QAIssue] {
        var issues: [QAIssue] = []
        let text = text.precomposedStringWithCanonicalMapping
        if text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            return [QAIssue(kind: .emptyText, message: "translation is empty")]
        }
        for component in template.sigCode.populated {
            guard let value = template.sigCode[component], let term = glossary.term(component, value, in: language) else { continue }
            if !text.contains(term) {
                issues.append(QAIssue(kind: .missingGlossaryTerm, message: "\(component.displayName) \(value) should use “\(term)”"))
            }
        }
        let expected = DoseSlot.count(in: template.english)
        let found = DoseSlot.count(in: text)
        if expected != found {
            issues.append(QAIssue(kind: .slotCountMismatch, message: "English has \(expected) [N] slot(s), translation has \(found)"))
        }
        if text.contains(where: { $0.isForeignDecimalDigit }) {
            issues.append(QAIssue(kind: .nonASCIIDigits, message: "numerals must be 0–9"))
        }
        return issues
    }

    /// Every (template, language) with issues, across the library.
    public static func report(_ library: TemplateLibrary, glossary: Glossary) -> [String: [QAIssue]] {
        var out: [String: [QAIssue]] = [:]
        for t in library.templates {
            for tr in t.translations {
                let issues = check(t, language: tr.language, glossary: glossary)
                if !issues.isEmpty { out["\(t.id)@\(tr.language.rawValue)"] = issues }
            }
        }
        return out
    }
}
