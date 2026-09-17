import Foundation

/// One line per decision: what was typed, what the engine understood, what it
/// offered, what the pharmacist did.
public struct AuditEntry: Codable, Sendable, Hashable, Identifiable {
    public enum Action: String, Codable, Sendable, CaseIterable {
        case matched
        case printed
        case printedEnglish
        case notThisOne
        case noneOfThese
        case noneFit
        case back
    }

    public var id: UUID
    public var at: Date
    public var rawSig: String
    public var normalized: String?
    public var sigKey: String?
    public var language: LanguageCode
    public var form: DosageForm
    public var state: String
    public var distance: Int?
    public var confidence: Double?
    public var coverage: Double?
    public var chosenTemplateID: String?
    public var action: Action
    public var initials: String

    public init(
        id: UUID = UUID(),
        at: Date = Date(),
        rawSig: String,
        normalized: String? = nil,
        sigKey: String? = nil,
        language: LanguageCode,
        form: DosageForm,
        state: String,
        distance: Int? = nil,
        confidence: Double? = nil,
        coverage: Double? = nil,
        chosenTemplateID: String? = nil,
        action: Action,
        initials: String
    ) {
        self.id = id
        self.at = at
        self.rawSig = rawSig
        self.normalized = normalized
        self.sigKey = sigKey
        self.language = language
        self.form = form
        self.state = state
        self.distance = distance
        self.confidence = confidence
        self.coverage = coverage
        self.chosenTemplateID = chosenTemplateID
        self.action = action
        self.initials = initials
    }

    public static func from(_ output: MatchOutput, raw: String, language: LanguageCode, form: DosageForm, action: Action, initials: String, chosen: String? = nil) -> AuditEntry {
        let best = output.result.best
        return AuditEntry(
            rawSig: raw,
            normalized: output.parsed?.normalizedText,
            sigKey: output.parsed?.code.key,
            language: language,
            form: form,
            state: output.result.stateName,
            distance: best?.distance,
            confidence: best?.confidence,
            coverage: output.parsed?.coverage,
            chosenTemplateID: chosen ?? best?.id,
            action: action,
            initials: initials
        )
    }
}

/// Append-only JSONL on disk. An actor because it is the one thing here that
/// touches a file from more than one place.
public actor AuditLog {
    public let url: URL

    public init(url: URL) {
        self.url = url
    }

    public func append(_ entry: AuditEntry) throws {
        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
        encoder.outputFormatting = [.sortedKeys, .withoutEscapingSlashes]
        var line = try encoder.encode(entry)
        line.append(0x0A)
        let directory = url.deletingLastPathComponent()
        try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        if !FileManager.default.fileExists(atPath: url.path) {
            try line.write(to: url, options: .atomic)
            return
        }
        let handle = try FileHandle(forWritingTo: url)
        defer { try? handle.close() }
        try handle.seekToEnd()
        try handle.write(contentsOf: line)
    }

    /// Every readable entry, oldest first. Malformed lines are skipped, not fatal.
    public func readAll() throws -> [AuditEntry] {
        guard FileManager.default.fileExists(atPath: url.path) else { return [] }
        let decoder = JSONCoding.makeDecoder()
        let text = try String(contentsOf: url, encoding: .utf8)
        return text.split(separator: "\n").compactMap { line in
            try? decoder.decode(AuditEntry.self, from: Data(line.utf8))
        }
    }

    public func clear() throws {
        if FileManager.default.fileExists(atPath: url.path) {
            try FileManager.default.removeItem(at: url)
        }
    }
}
