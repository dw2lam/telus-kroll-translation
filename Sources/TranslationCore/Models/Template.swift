import Foundation

/// The dose placeholder inside a template sentence. It is the only variable part
/// of a template; everything around it is a verified whole sentence.
public enum DoseSlot {
    public static let token = "[N]"

    public static func count(in text: String) -> Int {
        text.components(separatedBy: token).count - 1
    }
}

/// A Kroll sig code that expands to a template. `*1C` ("TAKE 1 CAPSULE ONCE A
/// DAY") is `qd.capsule` with the dose already implied, so it is an alias with
/// `impliedDose` rather than a second template with the same tuple.
public struct KrollCodeAlias: Codable, Sendable, Hashable {
    public var code: String
    public var impliedDose: String?

    public init(_ code: String, impliedDose: String? = nil) {
        self.code = code
        self.impliedDose = impliedDose
    }
}

/// One instruction pattern: a whole English sentence with an optional `[N]` dose
/// slot, keyed by its structured `SigCode`, with one `Translation` per language.
public struct Template: Codable, Sendable, Hashable, Identifiable {
    /// Stable slug, e.g. `bid.capsule`.
    public var id: String
    /// The Kroll sig codes that expand to this template, e.g. `BID`.
    public var krollCodes: [KrollCodeAlias]
    /// Groups form variants of the same instruction, e.g. `bid`.
    public var family: String
    public var form: DosageForm
    public var sigCode: SigCode
    public var english: String
    public var translations: [Translation]

    public init(
        id: String,
        krollCodes: [KrollCodeAlias] = [],
        family: String,
        form: DosageForm,
        sigCode: SigCode,
        english: String,
        translations: [Translation] = []
    ) {
        self.id = id
        self.krollCodes = krollCodes
        self.family = family
        self.form = form
        self.sigCode = sigCode
        self.english = english
        self.translations = translations
    }

    public var hasDoseSlot: Bool { DoseSlot.count(in: english) > 0 }

    /// The primary Kroll code shown in tables, if any.
    public var code: String? { krollCodes.first?.code }

    public func alias(for code: String) -> KrollCodeAlias? {
        let wanted = code.uppercased()
        return krollCodes.first { $0.code.uppercased() == wanted }
    }

    public func translation(for language: LanguageCode) -> Translation? {
        translations.first { $0.language == language }
    }

    public func verifiedTranslation(for language: LanguageCode) -> Translation? {
        translations.first { $0.language == language && $0.isServable }
    }

    public func isServable(in language: LanguageCode) -> Bool {
        verifiedTranslation(for: language) != nil
    }
}
