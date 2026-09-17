import SwiftUI
import TranslationCore

struct Chip: View {
    var text: String
    var tint: Color = .secondary
    var dashed = false

    var body: some View {
        Text(text)
            .font(.system(size: 11, design: .monospaced))
            .padding(.horizontal, 6).padding(.vertical, 2)
            .background(tint.opacity(0.12), in: RoundedRectangle(cornerRadius: 4))
            .overlay(RoundedRectangle(cornerRadius: 4).strokeBorder(tint.opacity(0.5), style: StrokeStyle(lineWidth: 1, dash: dashed ? [3, 2] : [])))
    }
}

extension VocabularyComponent {
    var tint: Color {
        switch self {
        case .verb: .purple
        case .dose: .orange
        case .form: .blue
        case .route: .teal
        case .frequency: .green
        case .timing: .mint
        case .prn: .pink
        case .indication: .red
        case .duration: .brown
        case .modifier: .indigo
        case .site: .cyan
        case .stop: .gray
        }
    }
}

/// The parse, as chips: recognised spans coloured by component, inferred
/// components dashed, unrecognised tokens grey.
struct ParseStrip: View {
    var parsed: ParsedSig?

    var body: some View {
        if let parsed {
            VStack(alignment: .leading, spacing: 6) {
                FlowLayout(spacing: 4) {
                    ForEach(Array(parsed.spans.enumerated()), id: \.offset) { _, span in
                        Chip(text: span.component == .stop ? span.surface : "\(span.surface) → \(span.value)", tint: span.component.tint)
                            .underline(span.corrected)
                    }
                    ForEach(parsed.unrecognised, id: \.self) { token in
                        Chip(text: token, tint: .gray)
                    }
                    ForEach(parsed.inferred, id: \.self) { component in
                        Chip(text: "\(component.rawValue) ≈ \(parsed.code[component] ?? "")", tint: .secondary, dashed: true)
                    }
                    if let dose = parsed.dose { Chip(text: "dose \(dose.value)", tint: .orange) }
                }
                Text(parsed.code.key).font(.system(size: 11, design: .monospaced)).foregroundStyle(.secondary)
                if !parsed.ambiguities.isEmpty {
                    Text("Ambiguous: " + parsed.ambiguities.map { "\($0.component.displayName) \($0.values.joined(separator: " / "))" }.joined(separator: "; "))
                        .font(.caption).foregroundStyle(.red)
                }
            }
        }
    }
}

struct FlowLayout: Layout {
    var spacing: CGFloat = 4

    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        let width = proposal.width ?? 400
        var x: CGFloat = 0, y: CGFloat = 0, rowHeight: CGFloat = 0
        for view in subviews {
            let size = view.sizeThatFits(.unspecified)
            if x + size.width > width, x > 0 { x = 0; y += rowHeight + spacing; rowHeight = 0 }
            x += size.width + spacing
            rowHeight = max(rowHeight, size.height)
        }
        return CGSize(width: width, height: y + rowHeight)
    }

    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        var x = bounds.minX, y = bounds.minY, rowHeight: CGFloat = 0
        for view in subviews {
            let size = view.sizeThatFits(.unspecified)
            if x + size.width > bounds.maxX, x > bounds.minX { x = bounds.minX; y += rowHeight + spacing; rowHeight = 0 }
            view.place(at: CGPoint(x: x, y: y), proposal: ProposedViewSize(size))
            x += size.width + spacing
            rowHeight = max(rowHeight, size.height)
        }
    }
}

struct ConfidenceBadge: View {
    var value: Double

    var body: some View {
        Text(value.formatted(.percent.precision(.fractionLength(0))))
            .font(.system(size: 11, weight: .semibold, design: .rounded))
            .padding(.horizontal, 6).padding(.vertical, 2)
            .background((value >= 0.9 ? Color.green : value >= 0.7 ? Color.orange : Color.red).opacity(0.15), in: Capsule())
    }
}

/// English label unchanged on the left; the supplementary label on the right,
/// RTL-aware, larger type for complex scripts, system fonts only.
struct LabelPreview: View {
    var label: RenderedLabel?
    var languageName: String

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Label preview").font(.headline)
            labelCard(title: "Vial label — English (unchanged)", text: label?.english ?? "—", rtl: false, large: false)
            labelCard(title: "Supplementary label — \(languageName)", text: label?.supplementary ?? "—", rtl: label?.isRTL ?? false, large: true)
            if let label, label.needsDose {
                Text("Enter a dose to fill the [N] slot before printing.").font(.caption).foregroundStyle(.orange)
            }
        }
    }

    func labelCard(title: String, text: String, rtl: Bool, large: Bool) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(title).font(.caption).foregroundStyle(.secondary)
            Text(text)
                .font(.system(size: large ? 20 : 15, weight: large ? .regular : .bold))
                .multilineTextAlignment(rtl ? .trailing : .leading)
                .frame(maxWidth: .infinity, alignment: rtl ? .trailing : .leading)
                .environment(\.layoutDirection, rtl ? .rightToLeft : .leftToRight)
                .padding(12)
                .background(.white, in: RoundedRectangle(cornerRadius: 6))
                .overlay(RoundedRectangle(cornerRadius: 6).strokeBorder(.quaternary))
                .foregroundStyle(.black)
        }
    }
}
