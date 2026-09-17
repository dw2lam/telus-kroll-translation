import SwiftUI
import TranslationCore

struct SigCodesView: View {
    @Environment(AppModel.self) private var model
    @State private var language: LanguageCode = .hi
    @State private var selection: String?
    @State private var editing: Template?
    @State private var showQA = false

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Text("Edit Sig Codes").font(.title2.bold())
                Spacer()
                Picker("Language", selection: $language) {
                    ForEach(LanguageCode.translatable) { l in Text(l.displayName).tag(l) }
                }.frame(width: 260)
                Button("QA report") { showQA = true }
                Button("Export CSV…") { exportCSV() }
            }
            Text("Only rows marked **verified** — with a translator, a reviewer and a date — are ever served. Everything else is invisible to Fill.")
                .font(.caption).foregroundStyle(.secondary)
            Table(model.library.templates, selection: $selection) {
                TableColumn("Code") { t in Text(t.krollCodes.map(\.code).joined(separator: ", ")).font(.system(.body, design: .monospaced)) }.width(90)
                TableColumn("Form") { t in Text(t.form.displayName) }.width(60)
                TableColumn("Tuple") { t in Text(t.sigCode.key).font(.system(size: 10, design: .monospaced)).foregroundStyle(.secondary) }.width(200)
                TableColumn("English") { t in Text(t.english) }
                TableColumn(language.displayName) { t in Text(t.translation(for: language)?.text ?? "—").font(.system(size: 14)) }
                TableColumn("Translator") { t in Text(t.translation(for: language)?.translator ?? "") }.width(80)
                TableColumn("Reviewer") { t in Text(t.translation(for: language)?.reviewer ?? "") }.width(80)
                TableColumn("Verified") { t in Text(t.translation(for: language)?.verifiedAt.map { $0.formatted(date: .abbreviated, time: .omitted) } ?? "") }.width(90)
                TableColumn("Status") { t in
                    let status = t.translation(for: language)?.status
                    Text(status?.displayName ?? "none")
                        .foregroundStyle(status == .verified ? .green : status == nil ? .secondary : .orange)
                }.width(70)
            }
            .contextMenu(forSelectionType: String.self) { _ in } primaryAction: { ids in
                if let id = ids.first { editing = model.library.template(id: id) }
            }
            HStack {
                Button("Edit translation…") { if let id = selection { editing = model.library.template(id: id) } }.disabled(selection == nil)
                Text("Double-click a row to edit. Verified languages: \(model.library.launchedLanguages().map(\.displayName).joined(separator: ", ")).").font(.caption).foregroundStyle(.secondary)
                Spacer()
            }
        }
        .padding(16)
        .sheet(item: $editing) { t in TranslationEditorSheet(template: t, language: language) }
        .sheet(isPresented: $showQA) { QAReportSheet() }
    }

    func exportCSV() {
        let panel = NSSavePanel()
        panel.nameFieldStringValue = "sig-codes.csv"
        if panel.runModal() == .OK, let url = panel.url {
            try? model.library.csv().write(to: url, atomically: true, encoding: .utf8)
        }
    }
}

struct TranslationEditorSheet: View {
    @Environment(AppModel.self) private var model
    @Environment(\.dismiss) private var dismiss
    let template: Template
    let language: LanguageCode
    @State private var text = ""
    @State private var translator = ""
    @State private var reviewer = ""
    @State private var note = ""
    @State private var issues: [QAIssue] = []
    @State private var overrideQA = false

    var liveIssues: [QAIssue] {
        LibraryQA.check(text: text, template: template, language: language, glossary: model.glossary)
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("\(template.code ?? template.id) — \(language.displayName)").font(.title3.bold())
            LabeledContent("English") { Text(template.english) }
            LabeledContent("Tuple") { Text(template.sigCode.key).font(.system(size: 11, design: .monospaced)) }
            TextEditor(text: $text).font(.system(size: 16)).frame(height: 80)
                .environment(\.layoutDirection, language.isRTL ? .rightToLeft : .leftToRight)
            if !liveIssues.isEmpty {
                ForEach(liveIssues, id: \.self) { issue in Label(issue.message, systemImage: "exclamationmark.triangle").font(.caption).foregroundStyle(.orange) }
            } else if !text.isEmpty {
                Label("Glossary terms present, [N] count matches, numerals 0–9.", systemImage: "checkmark.circle").font(.caption).foregroundStyle(.green)
            }
            HStack {
                TextField("Translator", text: $translator)
                TextField("Reviewer", text: $reviewer)
            }
            TextField("Revision note", text: $note)
            Toggle("Verify despite QA issues (recorded in history)", isOn: $overrideQA).disabled(liveIssues.isEmpty)
            let history = model.library.history(templateID: template.id, language: language)
            if !history.isEmpty {
                Text("History").font(.caption).foregroundStyle(.secondary)
                ForEach(history, id: \.id) { r in
                    Text("r\(r.revision) · \(r.recordedAt.formatted(date: .abbreviated, time: .shortened)) · \(r.snapshot.status.rawValue) · \(r.note ?? "")").font(.caption2)
                }
            }
            HStack {
                Spacer()
                Button("Cancel") { dismiss() }
                Button("Save as pending") {
                    var tr = template.translation(for: language) ?? Translation(language: language, text: text)
                    tr.text = text; tr.status = .pending; tr.translator = translator.isEmpty ? tr.translator : translator
                    tr.reviewer = nil; tr.verifiedAt = nil
                    model.saveTranslation(tr, templateID: template.id, note: note.isEmpty ? nil : note)
                    dismiss()
                }.disabled(text.isEmpty)
                Button("Mark verified") {
                    var tr = template.translation(for: language) ?? Translation(language: language, text: text)
                    tr.text = text; tr.status = .pending; tr.translator = translator.isEmpty ? tr.translator : translator
                    model.saveTranslation(tr, templateID: template.id, note: note.isEmpty ? nil : note)
                    issues = model.markVerified(templateID: template.id, language: language, translator: translator.isEmpty ? (tr.translator ?? "") : translator, reviewer: reviewer, overrideQA: overrideQA)
                    if issues.isEmpty { dismiss() }
                }.buttonStyle(.borderedProminent).disabled(text.isEmpty || reviewer.isEmpty || (translator.isEmpty && template.translation(for: language)?.translator == nil))
            }
        }
        .padding(20)
        .frame(width: 640)
        .onAppear {
            let tr = template.translation(for: language)
            text = tr?.text ?? ""
            translator = tr?.translator ?? ""
            reviewer = tr?.reviewer ?? ""
        }
    }
}

struct QAReportSheet: View {
    @Environment(AppModel.self) private var model
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        let report = LibraryQA.report(model.library, glossary: model.glossary)
        let structural = model.library.validate()
        VStack(alignment: .leading, spacing: 10) {
            Text("QA report").font(.title3.bold())
            if report.isEmpty && structural.isEmpty { Label("No issues.", systemImage: "checkmark.seal").foregroundStyle(.green) }
            ForEach(structural, id: \.self) { issue in Label(issue.description, systemImage: "xmark.octagon").foregroundStyle(.red) }
            ForEach(report.keys.sorted(), id: \.self) { key in
                VStack(alignment: .leading) {
                    Text(key).font(.system(.body, design: .monospaced).bold())
                    ForEach(report[key]!, id: \.self) { issue in Text("• " + issue.message).font(.caption) }
                }
            }
            HStack { Spacer(); Button("Close") { dismiss() } }
        }
        .padding(20).frame(width: 560)
    }
}
