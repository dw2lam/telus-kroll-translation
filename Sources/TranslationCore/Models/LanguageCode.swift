import Foundation

/// Languages the library can hold. A language is "launched" only once it has at
/// least one verified template; until then a patient's captured language shows as
/// "captured, not yet translatable".
public enum LanguageCode: String, Codable, Sendable, CaseIterable, Identifiable, Hashable {
    case en
    case hi
    case zhHant = "zh-Hant"
    case ar
    case tl

    public var id: String { rawValue }

    public var isRTL: Bool { self == .ar }

    /// Scripts that need larger type and CoreText's own font cascade on the label.
    public var usesComplexScript: Bool { self != .en }

    public var displayName: String {
        switch self {
        case .en: "English"
        case .hi: "Hindi"
        case .zhHant: "Chinese (Traditional)"
        case .ar: "Arabic"
        case .tl: "Tagalog"
        }
    }

    public var nativeName: String {
        switch self {
        case .en: "English"
        case .hi: "हिन्दी"
        case .zhHant: "繁體中文"
        case .ar: "العربية"
        case .tl: "Tagalog"
        }
    }

    /// Languages a patient can be recorded in (English needs no translation).
    public static var translatable: [LanguageCode] { allCases.filter { $0 != .en } }
}
