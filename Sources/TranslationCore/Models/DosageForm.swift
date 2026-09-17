import Foundation

/// The form picker on the Fill screen. Kroll knows the drug's form from the drug
/// card; here it narrows which templates are eligible.
public enum DosageForm: String, Codable, Sendable, CaseIterable, Identifiable, Hashable {
    case capsule
    case tablet
    case topical
    case any

    public var id: String { rawValue }

    public var displayName: String {
        switch self {
        case .capsule: "Capsule"
        case .tablet: "Tablet"
        case .topical: "Topical"
        case .any: "Any"
        }
    }

    public var route: RouteClass {
        switch self {
        case .capsule, .tablet: .oral
        case .topical: .topical
        case .any: .any
        }
    }

    /// The FORM component code a parsed sig would carry for this form, if any.
    public var formCode: String? {
        switch self {
        case .capsule: "CAPSULE"
        case .tablet: "TABLET"
        case .topical, .any: nil
        }
    }

    /// Whether a template of form `other` may serve a prescription of this form.
    public func accepts(_ other: DosageForm) -> Bool {
        self == .any || other == .any || self == other
    }
}

public enum RouteClass: String, Codable, Sendable, Hashable {
    case oral
    case topical
    case any
}
