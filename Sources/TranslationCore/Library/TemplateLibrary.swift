import Foundation

public enum LibraryError: Error, Equatable, CustomStringConvertible {
    case unknownTemplate(String)
    case missingTranslation(templateID: String, language: LanguageCode)
    case missingTranslator
    case missingReviewer
    case qaIssues([QAIssue])
    case malformedRow(Int, String)

    public var description: String {
        switch self {
        case .unknownTemplate(let id): "no template \(id)"
        case .missingTranslation(let id, let language): "\(id) has no \(language.displayName) translation"
        case .missingTranslator: "a translator is required"
        case .missingReviewer: "a reviewer is required before a translation can be verified"
        case .qaIssues(let issues): "QA: " + issues.map(\.message).joined(separator: "; ")
        case .malformedRow(let row, let why): "row \(row): \(why)"
        }
    }
}

public struct LibraryIssue: Sendable, Hashable, CustomStringConvertible {
    public var templateID: String
    public var message: String

    public var description: String { "\(templateID): \(message)" }
}

/// The template sheet plus its append-only history. A value type: the app edits
/// a copy, saves, and rebuilds the matcher.
public struct TemplateLibrary: Sendable, Equatable {
    public var templates: [Template]
    public var history: [TranslationRevision]

    public init(templates: [Template], history: [TranslationRevision] = []) {
        self.templates = templates.map(TemplateLibrary.nfc)
        self.history = history
    }

    static func nfc(_ template: Template) -> Template {
        var t = template
        t.english = t.english.precomposedStringWithCanonicalMapping
        t.translations = t.translations.map { var tr = $0; tr.text = tr.text.precomposedStringWithCanonicalMapping; return tr }
        return t
    }

    // MARK: Persistence

    public static let templatesFile = "templates.json"
    public static let historyFile = "history.json"

    public static func seed() throws -> TemplateLibrary {
        TemplateLibrary(
            templates: try SeedData.load([Template].self, "templates"),
            history: try SeedData.load([TranslationRevision].self, "history")
        )
    }

    public static func load(from directory: URL) throws -> TemplateLibrary {
        let templates = try JSONCoding.read([Template].self, from: directory.appendingPathComponent(templatesFile))
        let historyURL = directory.appendingPathComponent(historyFile)
        let history = FileManager.default.fileExists(atPath: historyURL.path)
            ? try JSONCoding.read([TranslationRevision].self, from: historyURL)
            : []
        return TemplateLibrary(templates: templates, history: history)
    }

    public func save(to directory: URL) throws {
        try JSONCoding.write(templates, to: directory.appendingPathComponent(TemplateLibrary.templatesFile))
        try JSONCoding.write(history, to: directory.appendingPathComponent(TemplateLibrary.historyFile))
    }

    // MARK: Lookup

    public func template(id: String) -> Template? {
        templates.first { $0.id == id }
    }

    public func template(sigCode: SigCode, form: DosageForm) -> Template? {
        templates.first { $0.sigCode == sigCode && $0.form == form }
    }

    /// Languages with at least one verified template — the only ones a label can print in.
    public func launchedLanguages() -> [LanguageCode] {
        LanguageCode.translatable.filter { isLaunched($0) }
    }

    public func isLaunched(_ language: LanguageCode) -> Bool {
        templates.contains { $0.isServable(in: language) }
    }

    /// Templates with a verified translation in `language`. Nothing else is ever served.
    public func servable(language: LanguageCode) -> [Template] {
        templates.filter { $0.isServable(in: language) }
    }

    /// The phrasing guide: what the pharmacist could reword to, for this form.
    public func supported(form: DosageForm, language: LanguageCode) -> [Template] {
        servable(language: language).filter { form.accepts($0.form) }
    }

    /// Every template a Kroll code expands to (one per form), with the alias that matched.
    public func resolve(krollCode: String) -> [(template: Template, alias: KrollCodeAlias)] {
        templates.compactMap { t in t.alias(for: krollCode).map { (t, $0) } }
    }

    public func history(templateID: String, language: LanguageCode) -> [TranslationRevision] {
        history.filter { $0.templateID == templateID && $0.language == language }
            .sorted { $0.revision < $1.revision }
    }

    // MARK: Editing

    /// Adds or replaces a translation, bumping its revision and recording a snapshot.
    @discardableResult
    public mutating func upsert(_ translation: Translation, templateID: String, note: String? = nil, at date: Date = Date()) throws -> Translation {
        guard let index = templates.firstIndex(where: { $0.id == templateID }) else {
            throw LibraryError.unknownTemplate(templateID)
        }
        var stored = translation
        stored.text = stored.text.precomposedStringWithCanonicalMapping
        stored.updatedAt = date
        if let existing = templates[index].translations.firstIndex(where: { $0.language == translation.language }) {
            stored.id = templates[index].translations[existing].id
            stored.revision = templates[index].translations[existing].revision + 1
            templates[index].translations[existing] = stored
        } else {
            stored.revision = 1
            templates[index].translations.append(stored)
        }
        history.append(TranslationRevision(templateID: templateID, language: stored.language, revision: stored.revision, snapshot: stored, recordedAt: date, note: note))
        return stored
    }

    /// The gate: a translation becomes servable only with a named translator and
    /// reviewer, a date, and no QA issues (unless explicitly overridden).
    @discardableResult
    public mutating func markVerified(
        templateID: String,
        language: LanguageCode,
        translator: String? = nil,
        reviewer: String,
        at date: Date = Date(),
        glossary: Glossary? = nil,
        overrideQA: Bool = false,
        note: String? = nil
    ) throws -> Translation {
        guard let template = template(id: templateID) else { throw LibraryError.unknownTemplate(templateID) }
        guard var translation = template.translation(for: language) else {
            throw LibraryError.missingTranslation(templateID: templateID, language: language)
        }
        let translatorName = translator ?? translation.translator
        guard let translatorName, !translatorName.trimmingCharacters(in: .whitespaces).isEmpty else { throw LibraryError.missingTranslator }
        guard !reviewer.trimmingCharacters(in: .whitespaces).isEmpty else { throw LibraryError.missingReviewer }
        if let glossary, !overrideQA {
            let issues = LibraryQA.check(template, language: language, glossary: glossary)
            if !issues.isEmpty { throw LibraryError.qaIssues(issues) }
        }
        translation.translator = translatorName
        translation.reviewer = reviewer
        translation.verifiedAt = date
        translation.status = .verified
        return try upsert(translation, templateID: templateID, note: note ?? "Verified", at: date)
    }

    /// Structural checks every sheet must pass before it ships.
    public func validate() -> [LibraryIssue] {
        var issues: [LibraryIssue] = []
        var ids: Set<String> = []
        var keys: Set<String> = []
        var codes: Set<String> = []
        for t in templates {
            if !ids.insert(t.id).inserted { issues.append(LibraryIssue(templateID: t.id, message: "duplicate id")) }
            if !keys.insert(t.sigCode.key + "@" + t.form.rawValue).inserted { issues.append(LibraryIssue(templateID: t.id, message: "duplicate tuple for form \(t.form.rawValue)")) }
            for alias in t.krollCodes where !codes.insert(alias.code.uppercased() + "@" + t.form.rawValue).inserted {
                issues.append(LibraryIssue(templateID: t.id, message: "Kroll code \(alias.code) used twice for form \(t.form.rawValue)"))
            }
            if t.sigCode.isEmpty { issues.append(LibraryIssue(templateID: t.id, message: "empty sig code")) }
            if let f = t.form.formCode, let code = t.sigCode.form, code != f { issues.append(LibraryIssue(templateID: t.id, message: "form \(t.form.rawValue) disagrees with sig code form \(code)")) }
            let slots = DoseSlot.count(in: t.english)
            for tr in t.translations {
                if DoseSlot.count(in: tr.text) != slots { issues.append(LibraryIssue(templateID: t.id, message: "\(tr.language.rawValue): [N] count differs from English")) }
                if tr.text.contains(where: { $0.isForeignDecimalDigit }) { issues.append(LibraryIssue(templateID: t.id, message: "\(tr.language.rawValue): non-ASCII digits")) }
                if tr.status == .verified, tr.translator == nil || tr.reviewer == nil || tr.verifiedAt == nil {
                    issues.append(LibraryIssue(templateID: t.id, message: "\(tr.language.rawValue): verified without translator, reviewer and date"))
                }
            }
        }
        return issues
    }

    // MARK: CSV — one row per template × translation

    public static let csvHeader = ["id", "krollCodes", "family", "form", "sigKey", "english", "language", "text", "status", "translator", "reviewer", "verifiedAt", "revision"]

    public func csv() -> String {
        let iso = ISO8601DateFormatter()
        var rows = [TemplateLibrary.csvHeader]
        for t in templates {
            let base = [t.id, t.krollCodes.map { $0.code + ($0.impliedDose.map { "=\($0)" } ?? "") }.joined(separator: ";"), t.family, t.form.rawValue, t.sigCode.key, t.english]
            if t.translations.isEmpty { rows.append(base + ["", "", "", "", "", "", ""]); continue }
            for tr in t.translations {
                rows.append(base + [tr.language.rawValue, tr.text, tr.status.rawValue, tr.translator ?? "", tr.reviewer ?? "", tr.verifiedAt.map(iso.string) ?? "", String(tr.revision)])
            }
        }
        return CSV.render(rows)
    }

    public static func fromCSV(_ text: String, keepingHistory history: [TranslationRevision] = []) throws -> TemplateLibrary {
        let iso = ISO8601DateFormatter()
        var rows = CSV.parse(text)
        if let header = rows.first, header.map({ $0.lowercased() }) == csvHeader.map({ $0.lowercased() }) { rows.removeFirst() }
        var order: [String] = []
        var byID: [String: Template] = [:]
        for (n, row) in rows.enumerated() where !row.allSatisfy(\.isEmpty) {
            let line = n + 2
            guard row.count >= 6 else { throw LibraryError.malformedRow(line, "expected at least 6 columns") }
            guard let form = DosageForm(rawValue: row[3]) else { throw LibraryError.malformedRow(line, "unknown form \(row[3])") }
            let aliases = row[1].split(separator: ";").map { part -> KrollCodeAlias in
                let bits = part.split(separator: "=", maxSplits: 1).map(String.init)
                return KrollCodeAlias(bits[0], impliedDose: bits.count > 1 ? bits[1] : nil)
            }
            var template = byID[row[0]] ?? Template(id: row[0], krollCodes: aliases, family: row[2], form: form, sigCode: SigCode(key: row[4]), english: row[5])
            if byID[row[0]] == nil { order.append(row[0]) }
            if row.count > 6, !row[6].isEmpty {
                guard let language = LanguageCode(rawValue: row[6]) else { throw LibraryError.malformedRow(line, "unknown language \(row[6])") }
                guard let status = TranslationStatus(rawValue: row.count > 8 ? row[8] : "draft") else { throw LibraryError.malformedRow(line, "unknown status") }
                let verifiedAt = row.count > 11 && !row[11].isEmpty ? iso.date(from: row[11]) : nil
                let revision = row.count > 12 ? Int(row[12]) ?? 1 : 1
                template.translations.append(Translation(
                    language: language, text: row.count > 7 ? row[7] : "", status: status,
                    translator: row.count > 9 && !row[9].isEmpty ? row[9] : nil,
                    reviewer: row.count > 10 && !row[10].isEmpty ? row[10] : nil,
                    verifiedAt: verifiedAt, revision: revision, updatedAt: verifiedAt ?? Date()
                ))
            }
            byID[row[0]] = template
        }
        return TemplateLibrary(templates: order.compactMap { byID[$0] }, history: history)
    }
}
