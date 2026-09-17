import SwiftUI
import TranslationCore

struct EvaluateView: View {
    @Environment(AppModel.self) private var model
    let bar = EvalBar()

    var body: some View {
        @Bindable var model = model
        HStack(alignment: .top, spacing: 16) {
            VStack(alignment: .leading, spacing: 10) {
                HStack {
                    Text("Evaluate").font(.title2.bold())
                    Spacer()
                    Button("Run eval set") { model.runEval() }.buttonStyle(.borderedProminent)
                }
                Text("The release bar: top-1 ≥ \(bar.top1.formatted(.percent)) and top-5 = \(bar.top5.formatted(.percent)) per language, every expected state matched.").font(.caption).foregroundStyle(.secondary)
                if let report = model.report {
                    Grid(alignment: .leading, horizontalSpacing: 16, verticalSpacing: 4) {
                        GridRow { Text("Language").bold(); Text("Cases").bold(); Text("Top-1").bold(); Text("Top-5").bold(); Text("States").bold(); Text("Bar").bold() }
                        ForEach(report.perLanguage.keys.sorted { $0.rawValue < $1.rawValue }, id: \.self) { l in
                            let m = report.perLanguage[l]!
                            GridRow {
                                Text(l.displayName); Text("\(m.cases)")
                                Text(m.top1.formatted(.percent.precision(.fractionLength(0))))
                                Text(m.top5.formatted(.percent.precision(.fractionLength(0))))
                                Text(m.stateAccuracy.formatted(.percent.precision(.fractionLength(0))))
                                Text(m.failures.isEmpty && m.top1 >= bar.top1 && m.top5 >= bar.top5 ? "pass" : "FAIL").foregroundStyle(m.failures.isEmpty ? .green : .red)
                            }
                        }
                    }
                    Text("\(report.skippedNotLaunched) case(s) skipped: language not launched.").font(.caption).foregroundStyle(.secondary)
                    if !report.failures.isEmpty {
                        Text("Failures").font(.headline)
                        ScrollView {
                            ForEach(Array(report.failures.enumerated()), id: \.offset) { _, f in
                                Text("• \(f.evalCase.sig) → \(f.message)").font(.caption)
                            }
                        }.frame(maxHeight: 160)
                    }
                }
                Divider()
                Text("Scratch — one sig per line, uses the Fill tab's language and form").font(.headline)
                TextEditor(text: $model.scratch).font(.system(.body, design: .monospaced)).frame(height: 120)
                Button("Run scratch") { model.runScratch() }
                Table(model.scratchRows) {
                    TableColumn("Sig") { r in Text(r.sig) }
                    TableColumn("State") { r in Text(r.state) }.width(120)
                    TableColumn("Conf.") { r in if let c = r.confidence { ConfidenceBadge(value: c) } }.width(60)
                    TableColumn("Top") { r in Text(r.top ?? "—").font(.system(size: 11, design: .monospaced)) }.width(140)
                    TableColumn("Why") { r in Text(r.explanation).font(.caption) }
                }
            }
            Divider()
            VStack(alignment: .leading, spacing: 8) {
                HStack { Text("Audit log").font(.headline); Spacer(); Button("Refresh") { model.loadAudit() } }
                List(model.auditEntries) { e in
                    VStack(alignment: .leading, spacing: 2) {
                        HStack { Text(e.action.rawValue).bold(); Text(e.state); Spacer(); Text(e.at.formatted(date: .omitted, time: .shortened)).foregroundStyle(.secondary) }
                        Text(e.rawSig).font(.system(size: 11, design: .monospaced))
                        Text("\(e.language.rawValue) · \(e.form.rawValue) · \(e.chosenTemplateID ?? "—") · \(e.initials)").font(.caption2).foregroundStyle(.secondary)
                    }
                }
            }
            .frame(width: 340)
            .onAppear { model.loadAudit() }
        }
        .padding(16)
    }
}
