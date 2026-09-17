import Foundation
import Testing
@testable import TranslationCore

struct AuditLogTests {
    @Test func appendsOneLinePerEntryAndSkipsGarbage() async throws {
        let url = FileManager.default.temporaryDirectory.appendingPathComponent("kl-audit-\(UUID().uuidString)/audit.jsonl")
        let log = AuditLog(url: url)
        let matcher = Matcher(library: try TemplateLibrary.seed(), vocabulary: try Vocabulary.seed(), glossary: try Glossary.seed())
        let output = matcher.match("1 CAP QHS PRN DIZZINESS", language: .hi, form: .capsule)
        try await log.append(AuditEntry.from(output, raw: "1 CAP QHS PRN DIZZINESS", language: .hi, form: .capsule, action: .matched, initials: "SB"))
        try await log.append(AuditEntry.from(output, raw: "1 CAP QHS PRN DIZZINESS", language: .hi, form: .capsule, action: .printed, initials: "SB"))
        let handle = try FileHandle(forWritingTo: url)
        try handle.seekToEnd()
        try handle.write(contentsOf: Data("{not json}\n".utf8))
        try handle.close()
        let entries = try await log.readAll()
        #expect(entries.count == 2)
        #expect(entries.map(\.action) == [.matched, .printed])
        #expect(entries.first?.state == "Closest match")
        #expect(entries.first?.sigKey == "TAKE|CAPSULE|PO|QHS|-|PRN|DIZZINESS|-|-|-")
        #expect(entries.first?.chosenTemplateID == "qhs-prn.capsule")
        #expect(try String(contentsOf: url, encoding: .utf8).split(separator: "\n").count == 3)
        try await log.clear()
        #expect(try await log.readAll().isEmpty)
        try? FileManager.default.removeItem(at: url.deletingLastPathComponent())
    }
}
