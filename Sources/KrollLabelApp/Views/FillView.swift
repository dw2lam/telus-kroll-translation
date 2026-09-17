import SwiftUI
import TranslationCore

struct FillView: View {
    @Environment(AppModel.self) private var model

    var body: some View {
        @Bindable var model = model
        HStack(alignment: .top, spacing: 16) {
            VStack(alignment: .leading, spacing: 12) {
                Text("F12 – Fill Rx").font(.title2.bold())
                Picker("Patient language", selection: $model.language) {
                    ForEach(LanguageCode.translatable) { l in Text("\(l.displayName) · \(l.nativeName)").tag(l) }
                }
                Picker("Dosage form", selection: $model.form) {
                    ForEach(DosageForm.allCases) { f in Text(f.displayName).tag(f) }
                }
                LabeledContent("Sig") {
                    TextField("code (BID, *1C, QHS PRN) or free text", text: $model.sigText)
                        .textFieldStyle(.roundedBorder)
                        .onSubmit { model.fill() }
                }
                LabeledContent("Dose") {
                    TextField("1", text: $model.doseText)
                        .textFieldStyle(.roundedBorder)
                        .frame(width: 80)
                        .onChange(of: model.doseText) { _, _ in model.refreshPreview() }
                }
                HStack {
                    Button("F12 – Fill Rx") { model.fill() }
                        .keyboardShortcut(.return, modifiers: .command)
                        .buttonStyle(.borderedProminent)
                    Button("Clear") { model.sigText = ""; model.doseText = ""; model.back() }
                    Spacer()
                    LabeledContent("Initials") { TextField("", text: $model.initials).frame(width: 50) }
                }
                Divider()
                Text("Recognised").font(.caption).foregroundStyle(.secondary)
                ParseStrip(parsed: model.currentOutput?.parsed)
                Text("Sample sigs: BID · *1C · 2 BID · 1 CAP QHS PRN DIZZINESS · TAKE ONE CAPSULE EVERY MORNING · apply sparingly to irritated skin · 1 cap bid tid · Amoxicillin 500mg")
                    .font(.caption2).foregroundStyle(.tertiary)
                Spacer()
            }
            .frame(width: 360)

            Divider()

            ResultPanel()
                .frame(maxWidth: .infinity, alignment: .topLeading)

            Divider()

            LabelPreview(label: model.preview, languageName: model.language.displayName)
                .frame(width: 320)
        }
        .padding(16)
    }
}

/// The Kroll pop-up, state by state, with exactly the buttons the prototype has.
struct ResultPanel: View {
    @Environment(AppModel.self) private var model

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            switch model.outcome {
            case .idle:
                Text("Translated Sig").font(.headline)
                Text("Enter a sig and press F12 – Fill Rx (⌘↩).").foregroundStyle(.secondary)
            case .result(let out):
                resultBody(out)
            case .guide(let templates, _):
                guideBody(templates)
            case .refused(let text):
                Text("Translated Sig — \(model.language.displayName)").font(.headline)
                Text("Can’t translate").font(.title3.bold()).foregroundStyle(.red)
                Text(text)
                actionBar(primary: ("✓ Print English label", true, { model.printEnglishOnly() }), others: [], back: true)
            case .printed(let label):
                Text("Label printed").font(.headline)
                Text(label.supplementary == nil ? "English only." : "English + \(label.language.displayName).")
                Button("Next Rx") { model.sigText = ""; model.doseText = ""; model.back() }
            }
        }
    }

    @ViewBuilder
    func resultBody(_ out: MatchOutput) -> some View {
        Text("Translated Sig — \(model.language.displayName)").font(.headline)
        switch out.result {
        case .exact(let c, let via):
            stateTitle("Exact match", c.confidence)
            candidateCard(c, subtitle: via == .sigCode ? "matched by sig code tuple" : "matched by Kroll code")
            actionBar(primary: ("✓ Print with translation", model.preview?.isPrintable ?? false, { model.printWithTranslation() }),
                      others: [("Not this one", { model.notThisOne() })], back: true)
        case .closest(let c, let rest):
            stateTitle("Closest match", c.confidence)
            candidateCard(c, subtitle: c.explanation)
            if !rest.isEmpty { Text("Then: " + rest.map { "\($0.template.code ?? $0.id) (d \($0.distance))" }.joined(separator: " · ")).font(.caption).foregroundStyle(.secondary) }
            actionBar(primary: ("✓ Use this sig", model.preview?.isPrintable ?? false, { model.printWithTranslation() }),
                      others: [("Not this one", { model.notThisOne() })], back: true)
        case .candidates(let list):
            stateTitle("Select the sig you meant", list.first?.confidence)
            ForEach(list) { c in
                Button { model.select(c.id) } label: {
                    HStack(alignment: .top) {
                        Image(systemName: model.selectedCandidate?.id == c.id ? "largecircle.fill.circle" : "circle")
                        VStack(alignment: .leading, spacing: 2) {
                            HStack { Text(c.template.code ?? "—").font(.system(.body, design: .monospaced).bold()); Text(c.template.english); Spacer(); ConfidenceBadge(value: c.confidence) }
                            Text(c.template.verifiedTranslation(for: model.language)?.text ?? "").font(.system(size: 15))
                            Text("d \(c.distance) · \(c.explanation)").font(.caption).foregroundStyle(.secondary)
                        }
                    }
                    .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
            }
            actionBar(primary: ("✓ Use selected", model.preview?.isPrintable ?? false, { model.printWithTranslation() }),
                      others: [("None of these", { model.noneOfThese() })], back: true)
        case .refused(let reason):
            Text("Can’t translate").font(.title3.bold()).foregroundStyle(.red)
            Text(model.matcher.refusalText(reason, language: model.language))
            if !out.guide.isEmpty { Button("Show supported sigs") { model.noneOfThese() } }
            actionBar(primary: ("✓ Print English label", true, { model.printEnglishOnly() }), others: [], back: true)
        case .notYetTranslatable(let language):
            Text("\(language.displayName) — captured, not yet translatable").font(.title3.bold())
            Text("No verified \(language.displayName) sig codes are configured yet. The vial label will print in English.")
            actionBar(primary: ("✓ Print English label", true, { model.printEnglishOnly() }), others: [], back: true)
        case .rejected(let reason):
            Text(reason == .empty ? "Enter a sig." : "That looks like a drug name.").font(.title3.bold()).foregroundStyle(.orange)
            if reason == .looksLikeDrugName { Text("Drug names are never translated — they stay on the English label exactly as dispensed.") }
            actionBar(primary: nil, others: [], back: true)
        }
    }

    @ViewBuilder
    func guideBody(_ templates: [Template]) -> some View {
        Text("Translated Sig — \(model.language.displayName)").font(.headline)
        Text("No verified \(model.language.displayName) sig code matches this sig. Sig codes with a verified translation — pick one, or go back and reword:").font(.callout)
        ScrollView {
            VStack(alignment: .leading, spacing: 4) {
                ForEach(templates) { t in
                    Button { model.useGuideEntry(t) } label: {
                        HStack(alignment: .top) {
                            Text(t.code ?? "—").font(.system(.body, design: .monospaced).bold()).frame(width: 90, alignment: .leading)
                            Text(t.english).frame(width: 300, alignment: .leading)
                            Text(t.verifiedTranslation(for: model.language)?.text ?? "").font(.system(size: 14))
                            Spacer()
                        }
                        .contentShape(Rectangle())
                    }
                    .buttonStyle(.plain)
                    .padding(.vertical, 3)
                }
            }
        }
        actionBar(primary: nil, others: [("None of these fit", { model.noneOfTheseFit() })], back: true)
    }

    func stateTitle(_ title: String, _ confidence: Double?) -> some View {
        HStack { Text(title).font(.title3.bold()); if let confidence { ConfidenceBadge(value: confidence) } }
    }

    func candidateCard(_ c: ScoredCandidate, subtitle: String) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            LabeledContent("Sig entered") { Text(model.sigText).bold() }
            LabeledContent("Matched sig code") { HStack { Text(c.template.code ?? "—").font(.system(.body, design: .monospaced).bold()); Text(c.template.english) } }
            LabeledContent(model.language.displayName) { Text(c.template.verifiedTranslation(for: model.language)?.text ?? "").font(.system(size: 17)) }
            Text(subtitle).font(.caption).foregroundStyle(.secondary)
        }
        .padding(10)
        .background(.quaternary.opacity(0.4), in: RoundedRectangle(cornerRadius: 6))
    }

    func actionBar(primary: (String, Bool, () -> Void)?, others: [(String, () -> Void)], back: Bool) -> some View {
        HStack {
            Spacer()
            if let (title, enabled, action) = primary {
                Button(title, action: action).buttonStyle(.borderedProminent).tint(.green).disabled(!enabled)
            }
            ForEach(Array(others.enumerated()), id: \.offset) { _, item in
                Button(item.0, action: item.1)
            }
            if back { Button("✗ Back to Rx") { model.back() } }
        }
        .padding(.top, 8)
    }
}
