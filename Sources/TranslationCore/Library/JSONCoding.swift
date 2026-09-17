import Foundation

/// Every sheet on disk is `{ "version": 1, "items": … }` so a later format can
/// migrate without guessing.
public struct Envelope<T: Codable & Sendable>: Codable, Sendable {
    public var version: Int
    public var items: T

    public init(version: Int = JSONCoding.currentVersion, items: T) {
        self.version = version
        self.items = items
    }
}

/// One place for the encoder/decoder settings so files diff cleanly
/// (pretty, sorted keys, ISO-8601 dates) and are written atomically.
public enum JSONCoding {
    public static let currentVersion = 1

    public static func makeEncoder() -> JSONEncoder {
        let encoder = JSONEncoder()
        encoder.outputFormatting = [.prettyPrinted, .sortedKeys, .withoutEscapingSlashes]
        encoder.dateEncodingStrategy = .iso8601
        return encoder
    }

    public static func makeDecoder() -> JSONDecoder {
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        return decoder
    }

    public static func encode<T: Encodable>(_ value: T) throws -> Data {
        try makeEncoder().encode(value)
    }

    public static func decode<T: Decodable>(_ type: T.Type, from data: Data) throws -> T {
        try makeDecoder().decode(type, from: data)
    }

    /// Writes `items` inside an `Envelope`, atomically, creating the directory if needed.
    public static func write<T: Codable & Sendable>(_ items: T, to url: URL) throws {
        let directory = url.deletingLastPathComponent()
        try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        let data = try encode(Envelope(items: items))
        try data.write(to: url, options: .atomic)
    }

    /// Reads the `items` out of an `Envelope` on disk.
    public static func read<T: Codable & Sendable>(_ type: T.Type, from url: URL) throws -> T {
        let data = try Data(contentsOf: url)
        return try decode(Envelope<T>.self, from: data).items
    }
}
