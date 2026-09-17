import Foundation

/// Resource bundle accessor that also works inside a hand-assembled, signed
/// `.app`, where SPM's `Bundle.module` would look at the bundle root.
enum ResourceBundle {
    static let bundle: Bundle = {
        let bundleName = "KrollLabel_TranslationCore"
        let candidates = [
            Bundle.main.resourceURL,
            Bundle.main.bundleURL,
        ]
        for candidate in candidates {
            if let url = candidate?.appendingPathComponent(bundleName + ".bundle"),
               let bundle = Bundle(url: url)
            {
                return bundle
            }
        }
        return .module
    }()
}

/// The sheets shipped with the engine. The app copies them to Application
/// Support on first launch and edits its own copy.
public enum SeedData {
    public static let names = ["vocabulary", "glossary", "templates", "history", "evalset"]

    public enum Error: Swift.Error, Equatable {
        case missing(String)
    }

    public static func url(for name: String) throws -> URL {
        guard let url = ResourceBundle.bundle.url(forResource: name, withExtension: "json", subdirectory: "Seed") else {
            throw Error.missing(name)
        }
        return url
    }

    public static func load<T: Codable & Sendable>(_ type: T.Type, _ name: String) throws -> T {
        try JSONCoding.read(type, from: url(for: name))
    }
}
