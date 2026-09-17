import Foundation

public enum TranslationStatus: String, Codable, Sendable, CaseIterable, Hashable {
    case draft
    case pending
    case verified

    public var displayName: String { rawValue.capitalized }
}

/// One language's sentence for a template, with the accountability the PRD
/// requires: who translated it, who reviewed it, when it was verified. Only a
/// `verified` translation is ever served.
public struct Translation: Codable, Sendable, Hashable, Identifiable {
    public var id: UUID
    public var language: LanguageCode
    public var text: String
    public var status: TranslationStatus
    public var translator: String?
    public var reviewer: String?
    public var verifiedAt: Date?
    public var revision: Int
    public var updatedAt: Date
    public var note: String?

    public init(
        id: UUID = UUID(),
        language: LanguageCode,
        text: String,
        status: TranslationStatus = .draft,
        translator: String? = nil,
        reviewer: String? = nil,
        verifiedAt: Date? = nil,
        revision: Int = 1,
        updatedAt: Date = Date(),
        note: String? = nil
    ) {
        self.id = id
        self.language = language
        self.text = text
        self.status = status
        self.translator = translator
        self.reviewer = reviewer
        self.verifiedAt = verifiedAt
        self.revision = revision
        self.updatedAt = updatedAt
        self.note = note
    }

    public var isServable: Bool { status == .verified }
}

/// An append-only snapshot taken every time a translation changes, so the
/// history of any template in any language can be retrieved.
public struct TranslationRevision: Codable, Sendable, Hashable, Identifiable {
    public var id: UUID
    public var templateID: String
    public var language: LanguageCode
    public var revision: Int
    public var snapshot: Translation
    public var recordedAt: Date
    public var note: String?

    public init(
        id: UUID = UUID(),
        templateID: String,
        language: LanguageCode,
        revision: Int,
        snapshot: Translation,
        recordedAt: Date = Date(),
        note: String? = nil
    ) {
        self.id = id
        self.templateID = templateID
        self.language = language
        self.revision = revision
        self.snapshot = snapshot
        self.recordedAt = recordedAt
        self.note = note
    }
}
