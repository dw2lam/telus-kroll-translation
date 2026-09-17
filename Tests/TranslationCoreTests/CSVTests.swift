import Testing
@testable import TranslationCore

struct CSVTests {
    @Test func parsesQuotedFieldsEmbeddedCommasAndNewlines() {
        let text = "\u{FEFF}a,b,c\r\n\"x, y\",\"say \"\"hi\"\"\",\"line1\nline2\"\n"
        let rows = CSV.parse(text)
        #expect(rows == [["a", "b", "c"], ["x, y", "say \"hi\"", "line1\nline2"]])
    }

    @Test func rendersAndRoundTrips() {
        let rows = [["surface", "component"], ["as needed, for", "prn"], ["\"q\"", "x"], ["दिन में", "hi"]]
        let text = CSV.render(rows)
        #expect(CSV.parse(text) == rows)
    }
}
