import Foundation

/// What prints. The English label is Kroll's own and is never altered by this
/// feature; the supplementary label carries only the translated instruction.
public struct RenderedLabel: Codable, Sendable, Hashable {
    public var english: String
    public var supplementary: String?
    public var language: LanguageCode
    public var isRTL: Bool
    /// The template has a `[N]` slot and no dose was given.
    public var needsDose: Bool

    public init(english: String, supplementary: String?, language: LanguageCode, isRTL: Bool, needsDose: Bool) {
        self.english = english
        self.supplementary = supplementary
        self.language = language
        self.isRTL = isRTL
        self.needsDose = needsDose
    }

    /// A label with a literal `[N]` left in it is never printable.
    public var isPrintable: Bool {
        !needsDose && !english.contains(DoseSlot.token) && !(supplementary ?? "").contains(DoseSlot.token)
    }
}

public struct LabelRenderer: Sendable {
    public init() {}

    /// Both labels, or `nil` when the language has no verified sentence for
    /// this template (pending text is never rendered).
    public func render(template: Template, dose: Dose?, language: LanguageCode) -> RenderedLabel? {
        guard language != .en else { return englishOnly(template: template, dose: dose) }
        guard let translation = template.verifiedTranslation(for: language) else { return nil }
        let needsDose = template.hasDoseSlot && dose == nil
        return RenderedLabel(
            english: LabelRenderer.substitute(template.english, dose: dose, isRTL: false, plural: true),
            supplementary: LabelRenderer.substitute(translation.text, dose: dose, isRTL: language.isRTL, plural: false),
            language: language,
            isRTL: language.isRTL,
            needsDose: needsDose
        )
    }

    public func englishOnly(template: Template, dose: Dose?) -> RenderedLabel {
        RenderedLabel(
            english: LabelRenderer.substitute(template.english, dose: dose, isRTL: false, plural: true),
            supplementary: nil,
            language: .en,
            isRTL: false,
            needsDose: template.hasDoseSlot && dose == nil
        )
    }

    /// Puts the dose into `[N]` as ASCII digits. Inside right-to-left text the
    /// digits are wrapped in Unicode isolates (U+2068…U+2069) so the bidi
    /// algorithm cannot move them next to the wrong word. English `(s)`
    /// plurals resolve against the dose.
    public static func substitute(_ text: String, dose: Dose?, isRTL: Bool, plural: Bool) -> String {
        var out = text.precomposedStringWithCanonicalMapping
        guard let dose, Numeral.isNumeral(dose.value) else { return out }
        let numeral = isRTL ? "\u{2068}\(dose.value)\u{2069}" : dose.value
        out = out.replacingOccurrences(of: DoseSlot.token, with: numeral)
        if plural {
            out = out.replacingOccurrences(of: "(s)", with: dose.value == "1" ? "" : "s")
        }
        return out
    }
}
