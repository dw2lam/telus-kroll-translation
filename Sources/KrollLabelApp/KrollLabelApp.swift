import AppKit
import SwiftUI
import TranslationCore

@main
struct KrollLabelApp: App {
    @NSApplicationDelegateAdaptor(AppDelegate.self) private var delegate
    @State private var model = AppModel()

    var body: some Scene {
        WindowGroup("Kroll Label") {
            ContentView()
                .environment(model)
                .frame(minWidth: 1100, minHeight: 700)
        }
        .defaultSize(width: 1240, height: 780)
    }
}

/// `swift run` launches a bare executable with no bundle; without this the
/// window can open behind the terminal and never get focus.
final class AppDelegate: NSObject, NSApplicationDelegate {
    func applicationDidFinishLaunching(_ notification: Notification) {
        NSApp.setActivationPolicy(.regular)
        NSApp.activate(ignoringOtherApps: true)
    }

    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool { true }
}

struct ContentView: View {
    @Environment(AppModel.self) private var model

    var body: some View {
        @Bindable var model = model
        VStack(spacing: 0) {
            TabView {
                FillView().tabItem { Label("Fill", systemImage: "pills") }
                SigCodesView().tabItem { Label("Sig Codes", systemImage: "list.bullet.rectangle") }
                TermsView().tabItem { Label("Terms", systemImage: "character.book.closed") }
                EvaluateView().tabItem { Label("Evaluate", systemImage: "checkmark.seal") }
            }
            if let status = model.status {
                HStack {
                    Text(status).font(.caption).foregroundStyle(.secondary)
                    Spacer()
                    Button("Dismiss") { model.status = nil }.buttonStyle(.link).font(.caption)
                }
                .padding(.horizontal, 12).padding(.vertical, 4)
                .background(.bar)
            }
        }
    }
}
