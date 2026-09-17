import SwiftUI
import TranslationCore

/// The recognition sheet — "the massive sheet" — searchable and editable.
struct TermsView: View {
    @Environment(AppModel.self) private var model
    @State private var search = ""
    @State private var component: VocabularyComponent?
    @State private var selection: String?
    @State private var newSurface = ""
    @State private var newComponent: VocabularyComponent = .frequency
    @State private var newValue = ""
    @State private var newWhen = ""
    @State private var error: String?
    @State private var tryPhrase = ""

    var rows: [VocabularyEntry] {
        model.vocabulary.entries.filter { e in
            (component == nil || e.component == component) &&
            (search.isEmpty || e.surface.localizedCaseInsensitiveContains(search) || e.value.localizedCaseInsensitiveContains(search))
        }
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Text("Terms").font(.title2.bold())
                Text("\(model.vocabulary.entries.count) rows").foregroundStyle(.secondary)
                Spacer()
                TextField("Search", text: $search).frame(width: 200)
                Picker("Component", selection: $component) {
                    Text("All").tag(VocabularyComponent?.none)
                    ForEach(VocabularyComponent.allCases, id: \.self) { c in Text(c.displayName).tag(VocabularyComponent?.some(c)) }
                }.frame(width: 200)
                Button("Import CSV…") { importCSV() }
                Button("Export CSV…") { exportCSV() }
            }
            Table(rows, selection: $selection) {
                TableColumn("Surface") { e in Text(e.surface) }
                TableColumn("Component") { e in Chip(text: e.component.displayName, tint: e.component.tint) }.width(110)
                TableColumn("Value") { e in Text(e.value).font(.system(.body, design: .monospaced)) }.width(120)
                TableColumn("When") { e in Text(e.when ?? "").foregroundStyle(.secondary) }.width(110)
            }
            HStack {
                TextField("surface (e.g. at lights out)", text: $newSurface).frame(width: 200)
                Picker("", selection: $newComponent) { ForEach(VocabularyComponent.allCases, id: \.self) { c in Text(c.displayName).tag(c) } }.frame(width: 130)
                TextField("VALUE", text: $newValue).frame(width: 110)
                TextField("when (form=DROP)", text: $newWhen).frame(width: 130)
                Button("Add row") {
                    error = model.addTerm(surface: newSurface, component: newComponent, value: newValue, when: newWhen.isEmpty ? nil : newWhen)
                    if error == nil { newSurface = ""; newValue = ""; newWhen = "" }
                }.disabled(newSurface.isEmpty || (newValue.isEmpty && newComponent != .stop))
                Button("Delete selected") { if let id = selection { model.removeTerm(id: id); selection = nil } }.disabled(selection == nil)
                if let error { Text(error).font(.caption).foregroundStyle(.red) }
            }
            Divider()
            HStack(alignment: .top) {
                Text("Try a phrase").font(.caption).foregroundStyle(.secondary)
                TextField("1 capsul at bedtme", text: $tryPhrase).frame(width: 300)
            }
            ParseStrip(parsed: tryPhrase.isEmpty ? nil : model.matcher.parser.parse(tryPhrase, form: model.form))
        }
        .padding(16)
    }

    func importCSV() {
        let panel = NSOpenPanel()
        panel.allowedContentTypes = [.commaSeparatedText, .plainText]
        if panel.runModal() == .OK, let url = panel.url, let text = try? String(contentsOf: url, encoding: .utf8) {
            error = model.importTerms(csv: text)
        }
    }

    func exportCSV() {
        let panel = NSSavePanel()
        panel.nameFieldStringValue = "vocabulary.csv"
        if panel.runModal() == .OK, let url = panel.url {
            try? model.vocabulary.csv().write(to: url, atomically: true, encoding: .utf8)
        }
    }
}
