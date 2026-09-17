import Foundation

/// What a recognition-sheet row can name: the ten sig components, plus the
/// dose (which becomes `[N]`) and stop words (which are ignored).
public enum VocabularyComponent: String, Codable, Sendable, CaseIterable, Hashable {
    case verb
    case dose
    case form
    case route
    case frequency
    case timing
    case prn
    case indication
    case duration
    case modifier
    case site
    case stop

    public var sigComponent: SigComponent? {
        switch self {
        case .verb: .verb
        case .form: .form
        case .route: .route
        case .frequency: .frequency
        case .timing: .timing
        case .prn: .prn
        case .indication: .indication
        case .duration: .duration
        case .modifier: .modifier
        case .site: .site
        case .dose, .stop: nil
        }
    }

    public var displayName: String {
        switch self {
        case .prn: "as needed"
        case .stop: "stop word"
        default: rawValue
        }
    }
}

/// One row of the recognition sheet: a surface form → a component code.
/// `#` in a surface matches one numeral and is substituted into the value
/// (`for # days` → `D7`, `q#-#h` → `Q4-6H`). `when` makes a row conditional on
/// what has already been recognised (`od` is a right-eye route only when the
/// form is `DROP`; otherwise it is once daily).
public struct VocabularyEntry: Codable, Sendable, Hashable, Identifiable {
    public var surface: String
    public var component: VocabularyComponent
    public var value: String
    public var when: String?
    public var note: String?

    public init(surface: String, component: VocabularyComponent, value: String, when: String? = nil, note: String? = nil) {
        self.surface = surface
        self.component = component
        self.value = value
        self.when = when
        self.note = note
    }

    public var id: String {
        "\(component.rawValue):\(surface)" + (when.map { "@\($0)" } ?? "")
    }

    var surfaceTokens: [String] { surface.split(separator: " ").map(String.init) }
    var isPattern: Bool { surface.contains("#") }

    /// `form=DROP` → (`.form`, `DROP`)
    var condition: (component: SigComponent, value: String)? {
        guard let when, let eq = when.firstIndex(of: "=") else { return nil }
        let name = String(when[..<eq]).trimmingCharacters(in: .whitespaces)
        let value = String(when[when.index(after: eq)...]).trimmingCharacters(in: .whitespaces)
        guard let component = SigComponent(rawValue: name), !value.isEmpty else { return nil }
        return (component, value.uppercased())
    }

    func conditionHolds(in context: SigCode) -> Bool {
        guard when != nil else { return true }
        guard let condition else { return false }
        return context[condition.component] == condition.value
    }
}

public struct VocabularyIssue: Sendable, Hashable, CustomStringConvertible {
    public var row: Int?
    public var message: String

    public init(row: Int? = nil, message: String) {
        self.row = row
        self.message = message
    }

    public var description: String {
        row.map { "row \($0): \(message)" } ?? message
    }
}

/// The recognition sheet with the indexes the parser needs. Value semantics:
/// the app edits a copy and rebuilds the matcher.
public struct Vocabulary: Sendable, Equatable {
    public private(set) var entries: [VocabularyEntry]
    public private(set) var maxTokens: Int
    private var literalByFirstToken: [String: [Int]]
    private var patternIndices: [Int]
    private var words: Set<String>

    public init(entries: [VocabularyEntry]) {
        let normalizer = Normalizer()
        self.entries = entries.map { entry in
            var e = entry
            e.surface = normalizer.text(entry.surface)
            e.value = entry.value.uppercased()
            return e
        }
        var literal: [String: [Int]] = [:]
        var patterns: [Int] = []
        var words: Set<String> = []
        var maxTokens = 1
        for (i, e) in self.entries.enumerated() {
            let tokens = e.surfaceTokens
            maxTokens = max(maxTokens, tokens.count)
            if let first = tokens.first, !first.contains("#") {
                literal[first, default: []].append(i)
            } else {
                patterns.append(i)
            }
            for t in tokens where t.count >= 5 && !t.contains("#") && !t.contains(where: \.isASCIIDigit) {
                words.insert(t)
            }
        }
        self.literalByFirstToken = literal
        self.patternIndices = patterns
        self.words = words
        self.maxTokens = maxTokens
    }

    public static func == (lhs: Vocabulary, rhs: Vocabulary) -> Bool {
        lhs.entries == rhs.entries
    }

    // MARK: Persistence

    public static func seed() throws -> Vocabulary {
        Vocabulary(entries: try SeedData.load([VocabularyEntry].self, "vocabulary"))
    }

    public static func load(from url: URL) throws -> Vocabulary {
        Vocabulary(entries: try JSONCoding.read([VocabularyEntry].self, from: url))
    }

    public func save(to url: URL) throws {
        try JSONCoding.write(entries, to: url)
    }

    public static let csvHeader = ["surface", "component", "value", "when", "note"]

    public static func fromCSV(_ text: String) throws -> Vocabulary {
        var rows = CSV.parse(text)
        guard let header = rows.first else { return Vocabulary(entries: []) }
        if header.map({ $0.lowercased() }) == csvHeader { rows.removeFirst() }
        var entries: [VocabularyEntry] = []
        for (n, row) in rows.enumerated() where !row.allSatisfy(\.isEmpty) {
            guard row.count >= 3 else { throw VocabularyError.malformedRow(n + 2) }
            guard let component = VocabularyComponent(rawValue: row[1].lowercased()) else {
                throw VocabularyError.unknownComponent(row: n + 2, row[1])
            }
            let when = row.count > 3 && !row[3].isEmpty ? row[3] : nil
            let note = row.count > 4 && !row[4].isEmpty ? row[4] : nil
            entries.append(VocabularyEntry(surface: row[0], component: component, value: row[2], when: when, note: note))
        }
        let vocabulary = Vocabulary(entries: entries)
        if let issue = vocabulary.validate().first { throw VocabularyError.invalid(issue) }
        return vocabulary
    }

    public func csv() -> String {
        CSV.render([Vocabulary.csvHeader] + entries.map { [$0.surface, $0.component.rawValue, $0.value, $0.when ?? "", $0.note ?? ""] })
    }

    // MARK: Editing

    public mutating func add(_ entry: VocabularyEntry) throws {
        var next = entries
        next.append(entry)
        let candidate = Vocabulary(entries: next)
        if let issue = candidate.validate().first { throw VocabularyError.invalid(issue) }
        self = candidate
    }

    public mutating func remove(id: String) {
        self = Vocabulary(entries: entries.filter { $0.id != id })
    }

    public func validate() -> [VocabularyIssue] {
        var issues: [VocabularyIssue] = []
        var seen: Set<String> = []
        for (i, e) in entries.enumerated() {
            let row = i + 1
            if e.surface.isEmpty { issues.append(VocabularyIssue(row: row, message: "empty surface")) }
            if e.value.isEmpty, e.component != .stop { issues.append(VocabularyIssue(row: row, message: "empty value for \(e.surface)")) }
            if e.when != nil, e.condition == nil { issues.append(VocabularyIssue(row: row, message: "unreadable condition \(e.when ?? "") on \(e.surface)")) }
            let surfaceHashes = e.surface.filter { $0 == "#" }.count
            let valueHashes = e.value.filter { $0 == "#" }.count
            if valueHashes > surfaceHashes { issues.append(VocabularyIssue(row: row, message: "value \(e.value) uses more # than surface \(e.surface)")) }
            if !seen.insert(e.id).inserted { issues.append(VocabularyIssue(row: row, message: "duplicate row \(e.id)")) }
        }
        return issues
    }

    // MARK: Matching

    public struct Match: Sendable, Hashable {
        public var entry: VocabularyEntry
        public var length: Int
        public var value: String
    }

    /// Longest match starting at `index`. At equal length a satisfied `when`
    /// row wins, then an unconditional literal, then a `#` pattern. Rows whose
    /// condition does not hold in `context` never match.
    public func longestMatch(in tokens: [String], at index: Int, context: SigCode) -> Match? {
        guard index < tokens.count else { return nil }
        var candidates = literalByFirstToken[tokens[index]] ?? []
        candidates.append(contentsOf: patternIndices)
        var best: Match?
        var bestRank = -1
        for i in candidates {
            let entry = entries[i]
            let surface = entry.surfaceTokens
            guard index + surface.count <= tokens.count else { continue }
            guard entry.conditionHolds(in: context) else { continue }
            guard let captures = Vocabulary.bind(surface: surface, to: tokens[index..<(index + surface.count)]) else { continue }
            let rank = entry.when != nil ? 2 : (entry.isPattern ? 0 : 1)
            if let b = best, surface.count < b.length { continue }
            if let b = best, surface.count == b.length, rank <= bestRank { continue }
            var value = entry.value
            for capture in captures {
                if let hash = value.firstIndex(of: "#") { value.replaceSubrange(hash...hash, with: capture) }
            }
            best = Match(entry: entry, length: surface.count, value: value)
            bestRank = rank
        }
        return best
    }

    /// Matches a surface (with `#` placeholders) against tokens; returns the numerals bound to each `#`.
    static func bind(surface: [String], to tokens: ArraySlice<String>) -> [String]? {
        var captures: [String] = []
        for (pattern, token) in zip(surface, tokens) {
            if !pattern.contains("#") {
                guard pattern == token else { return nil }
                continue
            }
            guard let bound = bindToken(pattern: pattern, token: token) else { return nil }
            captures.append(contentsOf: bound)
        }
        return captures
    }

    static func bindToken(pattern: String, token: String) -> [String]? {
        let pieces = pattern.split(separator: "#", omittingEmptySubsequences: false).map(String.init)
        var rest = Substring(token)
        var captures: [String] = []
        for (n, piece) in pieces.enumerated() {
            guard rest.hasPrefix(piece) else { return nil }
            rest = rest.dropFirst(piece.count)
            if n < pieces.count - 1 {
                var end = rest.startIndex
                var seenDot = false
                while end < rest.endIndex {
                    let c = rest[end]
                    if c.isASCIIDigit { end = rest.index(after: end) }
                    else if c == ".", !seenDot, end > rest.startIndex, rest.index(after: end) < rest.endIndex, rest[rest.index(after: end)].isASCIIDigit { seenDot = true; end = rest.index(after: end) }
                    else { break }
                }
                guard end > rest.startIndex else { return nil }
                captures.append(String(rest[..<end]))
                rest = rest[end...]
            }
        }
        return rest.isEmpty ? captures : nil
    }

    /// Every literal (non-`#`) value the sheet can produce for a component.
    public func values(for component: VocabularyComponent) -> Set<String> {
        Set(entries.filter { $0.component == component && !$0.value.contains("#") }.map(\.value))
    }

    // MARK: Spelling

    /// A single-edit correction for a misspelt sheet word, only when it is unambiguous.
    public func correction(for token: String) -> String? {
        guard token.count >= 5, !token.contains(where: \.isASCIIDigit), !words.contains(token) else { return nil }
        var hits: [String] = []
        for word in words where abs(word.count - token.count) <= 1 {
            if Levenshtein.distance(token, word, limit: 1) == 1 { hits.append(word) }
        }
        return hits.count == 1 ? hits[0] : nil
    }
}

public enum VocabularyError: Error, Equatable, CustomStringConvertible {
    case malformedRow(Int)
    case unknownComponent(row: Int, String)
    case invalid(VocabularyIssue)

    public var description: String {
        switch self {
        case .malformedRow(let row): "row \(row): expected surface,component,value"
        case .unknownComponent(let row, let name): "row \(row): unknown component \(name)"
        case .invalid(let issue): issue.description
        }
    }
}

public enum Levenshtein {
    /// Edit distance, or `limit + 1` as soon as it is known to exceed `limit`.
    public static func distance(_ a: String, _ b: String, limit: Int = .max) -> Int {
        let a = Array(a), b = Array(b)
        if abs(a.count - b.count) > limit { return limit + 1 }
        if a.isEmpty { return b.count }
        if b.isEmpty { return a.count }
        var previous = Array(0...b.count)
        var current = [Int](repeating: 0, count: b.count + 1)
        for i in 1...a.count {
            current[0] = i
            var rowMin = current[0]
            for j in 1...b.count {
                let cost = a[i - 1] == b[j - 1] ? 0 : 1
                current[j] = min(previous[j] + 1, current[j - 1] + 1, previous[j - 1] + cost)
                rowMin = min(rowMin, current[j])
            }
            if rowMin > limit { return limit + 1 }
            swap(&previous, &current)
        }
        return previous[b.count]
    }
}
