import SwiftUI
import TranslationCore

@main
struct KrollLabelApp: App {
    var body: some Scene {
        WindowGroup {
            Text("Kroll Label \(TranslationCoreInfo.version)")
                .padding()
        }
    }
}
