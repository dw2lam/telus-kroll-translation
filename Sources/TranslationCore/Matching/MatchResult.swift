import Foundation

/// One template, scored against the parsed sig.
public struct ScoredCandidate: Codable, Sendable, Hashable, Identifiable {
    public var template: Template
    public var dose: Dose?
    public var distance: Int
    public var confidence: Double
    public var diff: [ComponentDiff]
    public var coverage: Double
    public var prefilterRelaxed: Bool

    public var id: String { template.id }

    /// "missing from template: indication DIZZINESS"
    public var explanation: String {
        diff.isEmpty ? "exact match" : diff.map(\.description).joined(separator: "; ")
    }
}

public enum ExactRoute: Codable, Sendable, Hashable {
    case krollCode(String)
    case sigCode
}

public enum RefusalReason: Codable, Sendable, Hashable {
    case nothingRecognised
    case ambiguous([Ambiguity])
    case noCloseTemplate(best: Int?)
}

public enum RejectionReason: String, Codable, Sendable, Hashable {
    case empty
    case looksLikeDrugName
}

/// The PRD's states. 4 (phrasing guide) is the pharmacist's move after "none of
/// these"; the engine supplies the guide in `MatchOutput`.
public enum MatchResult: Codable, Sendable, Hashable {
    /// State 1
    case exact(ScoredCandidate, via: ExactRoute)
    /// State 2
    case closest(ScoredCandidate, runnersUp: [ScoredCandidate])
    /// State 3
    case candidates([ScoredCandidate])
    /// State 5, reached by the engine on its own
    case refused(RefusalReason)
    /// The patient's language has no verified templates yet
    case notYetTranslatable(language: LanguageCode)
    /// The field was not a sig at all
    case rejected(RejectionReason)

    public var stateNumber: Int? {
        switch self {
        case .exact: 1
        case .closest: 2
        case .candidates: 3
        case .refused: 5
        case .notYetTranslatable, .rejected: nil
        }
    }

    public var stateName: String {
        switch self {
        case .exact: "Exact match"
        case .closest: "Closest match"
        case .candidates: "Top candidates"
        case .refused: "Can’t translate"
        case .notYetTranslatable: "Not yet translatable"
        case .rejected: "Not a sig"
        }
    }

    public var confidence: Double? {
        switch self {
        case .exact(let c, _), .closest(let c, _): c.confidence
        case .candidates(let list): list.first?.confidence
        default: nil
        }
    }

    public var best: ScoredCandidate? {
        switch self {
        case .exact(let c, _), .closest(let c, _): c
        case .candidates(let list): list.first
        default: nil
        }
    }

    public var ranked: [ScoredCandidate] {
        switch self {
        case .exact(let c, _): [c]
        case .closest(let c, let rest): [c] + rest
        case .candidates(let list): list
        default: []
        }
    }
}

/// What the app gets back: the parse (for the chips), the state, and the
/// phrasing guide it will need if the pharmacist says "none of these".
public struct MatchOutput: Codable, Sendable, Hashable {
    public var parsed: ParsedSig?
    public var result: MatchResult
    public var guide: [Template]
}

public struct MatcherConfiguration: Codable, Sendable, Hashable {
    public var weights: ComponentWeights
    /// Best distance at or below this is "closest" (one silent low-weight component).
    public var closestMaxDistance: Int
    /// Candidates further than this are not shown at all.
    public var candidateMaxDistance: Int
    public var topK: Int

    public init(weights: ComponentWeights = .default, closestMaxDistance: Int = 1, candidateMaxDistance: Int = 8, topK: Int = 5) {
        self.weights = weights
        self.closestMaxDistance = closestMaxDistance
        self.candidateMaxDistance = candidateMaxDistance
        self.topK = topK
    }
}
