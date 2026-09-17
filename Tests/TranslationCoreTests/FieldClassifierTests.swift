import Testing
@testable import TranslationCore

struct FieldClassifierTests {
    let parser = SigParser(vocabulary: try! Vocabulary.seed())
    let classifier = FieldClassifier()

    func verdict(_ s: String) -> FieldClassifier.Verdict {
        classifier.classify(s, parsed: parser.parse(s))
    }

    @Test func drugNamesAreRejected() {
        #expect(verdict("Euro-Fer 300mg") == .drugName)
        #expect(verdict("Amoxicillin 500mg") == .drugName)
        #expect(verdict("atorvastatin") == .drugName)
        #expect(verdict("Ferrous Fumarate 300 mg") == .drugName)
    }

    @Test func sigsPass() {
        #expect(verdict("take 1 capsule daily") == .sig)
        #expect(verdict("1 CAP QHS PRN DIZZINESS") == .sig)
        #expect(verdict("apply sparingly to irritated skin") == .sig)
        #expect(verdict("use as directed") == .sig)
    }

    @Test func emptyIsEmpty() {
        #expect(verdict("") == .empty)
        #expect(verdict("   ") == .empty)
    }
}
