import Foundation
import Observation
import TranslationCore

/// Where the pharmacist is in the Fill flow. States 1–3 live inside
/// `MatchOutput`; the guide and the refusal are the pharmacist's own moves.
enum FillOutcome: Equatable {
    case idle
    case result(MatchOutput)
    case guide([Template], after: MatchOutput?)
    case refused(String)
    case printed(RenderedLabel)
}

struct ScratchRow: Identifiable {
    let id = UUID()
    var sig: String
    var state: String
    var confidence: Double?
    var top: String?
    var unrecognised: [String]
    var explanation: String
}

@Observable
@MainActor
final class AppModel {
    // Sheets
    var library: TemplateLibrary
    var vocabulary: Vocabulary
    var glossary: Glossary
    @ObservationIgnored private(set) var matcher: Matcher
    @ObservationIgnored let audit: AuditLog
    @ObservationIgnored let renderer = LabelRenderer()

    var initials = "SB"
    var status: String?
    var loadedFromSeed = false

    // Fill
    var language: LanguageCode = .hi
    var form: DosageForm = .capsule
    var sigText = ""
    var doseText = ""
    var outcome: FillOutcome = .idle
    var selectedCandidateID: String?
    var preview: RenderedLabel?

    // Evaluate
    var report: EvalReport?
    var scratch = ""
    var scratchRows: [ScratchRow] = []
    var auditEntries: [AuditEntry] = []

    init() {
        var library: TemplateLibrary
        var vocabulary: Vocabulary
        var glossary: Glossary
        do {
            try DataDirectory.bootstrap()
            library = try TemplateLibrary.load(from: DataDirectory.directory)
            vocabulary = try Vocabulary.load(from: DataDirectory.url("vocabulary"))
            glossary = try Glossary.load(from: DataDirectory.url("glossary"))
        } catch {
            // A damaged file must not take the app down: fall back to the shipped sheets.
            library = (try? TemplateLibrary.seed()) ?? TemplateLibrary(templates: [])
            vocabulary = (try? Vocabulary.seed()) ?? Vocabulary(entries: [])
            glossary = (try? Glossary.seed()) ?? Glossary(entries: [])
            loadedFromSeed = true
        }
        self.library = library
        self.vocabulary = vocabulary
        self.glossary = glossary
        self.matcher = Matcher(library: library, vocabulary: vocabulary, glossary: glossary)
        self.audit = AuditLog(url: DataDirectory.auditURL)
        if loadedFromSeed { status = "Could not read Application Support — showing the shipped sheets." }
    }

    func rebuildMatcher() {
        matcher = Matcher(library: library, vocabulary: vocabulary, glossary: glossary)
    }

    // MARK: Persistence

    func saveLibrary() {
        do { try library.save(to: DataDirectory.directory); rebuildMatcher(); status = "Saved sig codes." }
        catch { status = "Could not save: \(error)" }
    }

    func saveVocabulary() {
        do { try vocabulary.save(to: DataDirectory.url("vocabulary")); rebuildMatcher(); status = "Saved terms." }
        catch { status = "Could not save: \(error)" }
    }

    func saveGlossary() {
        do { try glossary.save(to: DataDirectory.url("glossary")); rebuildMatcher() }
        catch { status = "Could not save: \(error)" }
    }

    // MARK: Fill

    var dose: Dose? {
        let trimmed = doseText.trimmingCharacters(in: .whitespaces)
        return Numeral.isNumeral(trimmed) ? Dose(trimmed) : nil
    }

    var currentOutput: MatchOutput? {
        switch outcome {
        case .result(let out): out
        case .guide(_, let after): after
        default: nil
        }
    }

    var selectedCandidate: ScoredCandidate? {
        guard let out = currentOutput else { return nil }
        let ranked = out.result.ranked
        if let id = selectedCandidateID, let c = ranked.first(where: { $0.id == id }) { return c }
        return ranked.first
    }

    func fill() {
        let output = matcher.match(sigText, language: language, form: form)
        outcome = .result(output)
        selectedCandidateID = output.result.best?.id
        if doseText.isEmpty, let d = output.result.best?.dose { doseText = d.value }
        refreshPreview()
        log(output, action: .matched)
    }

    func refreshPreview() {
        guard let candidate = selectedCandidate else { preview = nil; return }
        let effectiveDose = dose ?? candidate.dose
        preview = renderer.render(template: candidate.template, dose: effectiveDose, language: language)
    }

    func select(_ id: String) {
        selectedCandidateID = id
        refreshPreview()
    }

    func notThisOne() {
        guard case .result(let out) = outcome, let best = out.result.best else { return }
        let rest = out.result.ranked.filter { $0.id != best.id }
        log(out, action: .notThisOne)
        if rest.isEmpty {
            outcome = .guide(out.guide, after: out)
        } else {
            var next = out
            next.result = .candidates(rest)
            outcome = .result(next)
            selectedCandidateID = rest.first?.id
        }
        refreshPreview()
    }

    func noneOfThese() {
        guard let out = currentOutput else { return }
        log(out, action: .noneOfThese)
        outcome = .guide(out.guide, after: out)
        preview = nil
    }

    func useGuideEntry(_ template: Template) {
        sigText = template.english.replacingOccurrences(of: DoseSlot.token, with: dose?.value ?? "1")
        fill()
    }

    func noneOfTheseFit() {
        if let out = currentOutput { log(out, action: .noneFit) }
        outcome = .refused(matcher.refusalText(language: language))
        preview = nil
    }

    func back() {
        if let out = currentOutput { log(out, action: .back) }
        outcome = .idle
        preview = nil
        selectedCandidateID = nil
    }

    func printWithTranslation() {
        guard let label = preview, label.isPrintable, let out = currentOutput else { return }
        log(out, action: .printed, chosen: selectedCandidate?.id)
        outcome = .printed(label)
    }

    func printEnglishOnly() {
        let label: RenderedLabel
        if let candidate = selectedCandidate {
            label = renderer.englishOnly(template: candidate.template, dose: dose ?? candidate.dose)
        } else {
            label = RenderedLabel(english: sigText.uppercased(), supplementary: nil, language: .en, isRTL: false, needsDose: false)
        }
        if let out = currentOutput { log(out, action: .printedEnglish) }
        outcome = .printed(label)
        preview = label
    }

    func log(_ output: MatchOutput, action: AuditEntry.Action, chosen: String? = nil) {
        let entry = AuditEntry.from(output, raw: sigText, language: language, form: form, action: action, initials: initials, chosen: chosen)
        let audit = self.audit
        Task { try? await audit.append(entry) }
    }

    // MARK: Library editing

    func saveTranslation(_ translation: Translation, templateID: String, note: String?) {
        do {
            try library.upsert(translation, templateID: templateID, note: note)
            saveLibrary()
        } catch { status = "\(error)" }
    }

    func markVerified(templateID: String, language: LanguageCode, translator: String, reviewer: String, overrideQA: Bool) -> [QAIssue] {
        do {
            try library.markVerified(templateID: templateID, language: language, translator: translator, reviewer: reviewer, glossary: glossary, overrideQA: overrideQA)
            saveLibrary()
            return []
        } catch LibraryError.qaIssues(let issues) {
            return issues
        } catch {
            status = "\(error)"
            return []
        }
    }

    // MARK: Terms editing

    func addTerm(surface: String, component: VocabularyComponent, value: String, when: String?) -> String? {
        do {
            try vocabulary.add(VocabularyEntry(surface: surface, component: component, value: value, when: when))
            saveVocabulary()
            return nil
        } catch { return "\(error)" }
    }

    func removeTerm(id: String) {
        vocabulary.remove(id: id)
        saveVocabulary()
    }

    func importTerms(csv: String) -> String? {
        do {
            vocabulary = try Vocabulary.fromCSV(csv)
            saveVocabulary()
            return nil
        } catch { return "\(error)" }
    }

    // MARK: Evaluate

    func runEval() {
        do {
            report = Evaluator(matcher: matcher).run(try Evaluator.seedCases())
        } catch { status = "\(error)" }
    }

    func runScratch() {
        scratchRows = scratch.split(separator: "\n").map(String.init).filter { !$0.trimmingCharacters(in: .whitespaces).isEmpty }.map { line in
            let out = matcher.match(line, language: language, form: form)
            return ScratchRow(
                sig: line,
                state: out.result.stateName,
                confidence: out.result.confidence,
                top: out.result.best?.id,
                unrecognised: out.parsed?.unrecognised ?? [],
                explanation: out.result.best?.explanation ?? refusalOrReason(out)
            )
        }
    }

    func refusalOrReason(_ out: MatchOutput) -> String {
        switch out.result {
        case .refused(let reason): matcher.refusalText(reason, language: language)
        case .notYetTranslatable(let l): "\(l.displayName): captured, not yet translatable"
        case .rejected(.looksLikeDrugName): "looks like a drug name — never translated"
        case .rejected(.empty): "empty"
        default: ""
        }
    }

    func loadAudit() {
        let audit = self.audit
        Task { @MainActor in
            auditEntries = ((try? await audit.readAll()) ?? []).reversed()
        }
    }
}
