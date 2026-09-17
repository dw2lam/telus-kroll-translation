import Foundation

/// The ten components a prescription instruction decomposes into. The dose is
/// deliberately not one of them: it is the `[N]` slot, not part of the key.
public enum SigComponent: String, Codable, Sendable, CaseIterable, Hashable {
    case verb
    case form
    case route
    case frequency
    case timing
    case prn
    case indication
    case duration
    case modifier
    case site

    public var displayName: String {
        switch self {
        case .prn: "as needed"
        default: rawValue
        }
    }
}

/// The structured code a sig parses into. Templates are keyed by it; matching is
/// arithmetic on it. Component values are uppercase codes from the recognition
/// sheet (`TAKE`, `CAPSULE`, `PO`, `QHS`, `AC`, `DIZZINESS`, `7D`, `SPARINGLY`…).
public struct SigCode: Hashable, Codable, Sendable {
    public var verb: String?
    public var form: String?
    public var route: String?
    public var frequency: String?
    public var timing: String?
    public var prn: Bool
    public var indication: String?
    public var duration: String?
    public var modifier: String?
    public var site: String?

    public init(
        verb: String? = nil,
        form: String? = nil,
        route: String? = nil,
        frequency: String? = nil,
        timing: String? = nil,
        prn: Bool = false,
        indication: String? = nil,
        duration: String? = nil,
        modifier: String? = nil,
        site: String? = nil
    ) {
        self.verb = verb
        self.form = form
        self.route = route
        self.frequency = frequency
        self.timing = timing
        self.prn = prn
        self.indication = indication
        self.duration = duration
        self.modifier = modifier
        self.site = site
    }

    public static let prnCode = "PRN"

    public subscript(component: SigComponent) -> String? {
        get {
            switch component {
            case .verb: verb
            case .form: form
            case .route: route
            case .frequency: frequency
            case .timing: timing
            case .prn: prn ? SigCode.prnCode : nil
            case .indication: indication
            case .duration: duration
            case .modifier: modifier
            case .site: site
            }
        }
        set {
            switch component {
            case .verb: verb = newValue
            case .form: form = newValue
            case .route: route = newValue
            case .frequency: frequency = newValue
            case .timing: timing = newValue
            case .prn: prn = newValue != nil
            case .indication: indication = newValue
            case .duration: duration = newValue
            case .modifier: modifier = newValue
            case .site: site = newValue
            }
        }
    }

    public var isEmpty: Bool {
        SigComponent.allCases.allSatisfy { self[$0] == nil }
    }

    /// Components that carry a value, in canonical order.
    public var populated: [SigComponent] {
        SigComponent.allCases.filter { self[$0] != nil }
    }

    /// Weighted count of differing components — the whole ranking model.
    public func distance(to other: SigCode, weights: ComponentWeights = .default) -> Int {
        SigComponent.allCases.reduce(0) { sum, component in
            self[component] == other[component] ? sum : sum + weights.weight(for: component)
        }
    }

    /// Every component that differs, with what each side has, so a result can
    /// say exactly why it is not exact.
    public func diff(_ other: SigCode, weights: ComponentWeights = .default) -> [ComponentDiff] {
        SigComponent.allCases.compactMap { component in
            let mine = self[component]
            let theirs = other[component]
            guard mine != theirs else { return nil }
            return ComponentDiff(component: component, input: mine, template: theirs, weight: weights.weight(for: component))
        }
    }

    /// `TAKE|CAPSULE|PO|QHS|-|PRN|-|-|-|-` — one slot per component, in order.
    public var key: String {
        SigComponent.allCases.map { self[$0] ?? "-" }.joined(separator: "|")
    }

    public init(key: String) {
        self.init()
        let parts = key.split(separator: "|", omittingEmptySubsequences: false).map(String.init)
        for (component, part) in zip(SigComponent.allCases, parts) where part != "-" && !part.isEmpty {
            self[component] = part
        }
    }

    /// `TAKE · CAPSULE · QHS · PRN · DIZZINESS`
    public var summary: String {
        let parts = populated.compactMap { self[$0] }
        return parts.isEmpty ? "—" : parts.joined(separator: " · ")
    }
}

/// How much each component counts when two codes are compared. Verb, form and
/// frequency dominate; an indication or a modifier barely moves the score.
public struct ComponentWeights: Codable, Sendable, Hashable {
    public var verb: Int
    public var form: Int
    public var route: Int
    public var frequency: Int
    public var timing: Int
    public var prn: Int
    public var indication: Int
    public var duration: Int
    public var modifier: Int
    public var site: Int

    public init(
        verb: Int = 5,
        form: Int = 4,
        route: Int = 3,
        frequency: Int = 4,
        timing: Int = 2,
        prn: Int = 3,
        indication: Int = 1,
        duration: Int = 2,
        modifier: Int = 1,
        site: Int = 2
    ) {
        self.verb = verb
        self.form = form
        self.route = route
        self.frequency = frequency
        self.timing = timing
        self.prn = prn
        self.indication = indication
        self.duration = duration
        self.modifier = modifier
        self.site = site
    }

    public static let `default` = ComponentWeights()

    public func weight(for component: SigComponent) -> Int {
        switch component {
        case .verb: verb
        case .form: form
        case .route: route
        case .frequency: frequency
        case .timing: timing
        case .prn: prn
        case .indication: indication
        case .duration: duration
        case .modifier: modifier
        case .site: site
        }
    }

    /// The distance between two codes that share nothing.
    public var maximum: Int {
        SigComponent.allCases.reduce(0) { $0 + weight(for: $1) }
    }
}

/// One differing component between a parsed sig and a template.
public struct ComponentDiff: Hashable, Codable, Sendable {
    public enum Kind: String, Codable, Sendable {
        /// The sig says it; the template does not.
        case missingFromTemplate
        /// The template says it; the sig does not.
        case extraInTemplate
        /// Both say something, but not the same thing.
        case different
    }

    public var component: SigComponent
    public var input: String?
    public var template: String?
    public var weight: Int

    public init(component: SigComponent, input: String?, template: String?, weight: Int) {
        self.component = component
        self.input = input
        self.template = template
        self.weight = weight
    }

    public var kind: Kind {
        switch (input, template) {
        case (.some, .none): .missingFromTemplate
        case (.none, .some): .extraInTemplate
        default: .different
        }
    }

    /// `missing from template: indication DIZZINESS`
    public var description: String {
        switch kind {
        case .missingFromTemplate:
            "missing from template: \(component.displayName) \(input ?? "")"
        case .extraInTemplate:
            "template adds: \(component.displayName) \(template ?? "")"
        case .different:
            "\(component.displayName): sig says \(input ?? "—"), template says \(template ?? "—")"
        }
    }
}
