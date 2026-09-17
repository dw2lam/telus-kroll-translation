import Foundation
import TranslationCore

/// `~/Library/Application Support/KrollLabel/` — the app edits its own copy of
/// every sheet. Seeds are copied in once and never overwritten.
enum DataDirectory {
    static let directory: URL = {
        let base = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
        return base.appendingPathComponent("KrollLabel", isDirectory: true)
    }()

    static func url(_ name: String) -> URL {
        directory.appendingPathComponent("\(name).json")
    }

    static var auditURL: URL { directory.appendingPathComponent("audit.jsonl") }

    @discardableResult
    static func bootstrap() throws -> [String] {
        try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        var copied: [String] = []
        for name in SeedData.names {
            let destination = url(name)
            guard !FileManager.default.fileExists(atPath: destination.path) else { continue }
            try FileManager.default.copyItem(at: try SeedData.url(for: name), to: destination)
            copied.append(name)
        }
        return copied
    }
}
