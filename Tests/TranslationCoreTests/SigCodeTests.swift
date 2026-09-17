import Testing
@testable import TranslationCore

struct SigCodeTests {
    let qhsPrn = SigCode(verb: "TAKE", form: "CAPSULE", route: "PO", frequency: "QHS", prn: true)

    @Test func identicalCodesHaveZeroDistance() {
        #expect(qhsPrn.distance(to: qhsPrn) == 0)
        #expect(qhsPrn.diff(qhsPrn).isEmpty)
    }

    @Test func anIndicationCostsOne() {
        var withIndication = qhsPrn
        withIndication.indication = "DIZZINESS"
        #expect(withIndication.distance(to: qhsPrn) == 1)
        let diff = withIndication.diff(qhsPrn)
        #expect(diff.count == 1)
        #expect(diff.first?.component == .indication)
        #expect(diff.first?.kind == .missingFromTemplate)
        #expect(diff.first?.description == "missing from template: indication DIZZINESS")
    }

    @Test func frequencyAndPrnAreExpensive() {
        let qd = SigCode(verb: "TAKE", form: "CAPSULE", route: "PO", frequency: "QD")
        // frequency differs (4) and prn differs (3)
        #expect(qhsPrn.distance(to: qd) == 7)
        #expect(qd.diff(qhsPrn).map(\.component) == [.frequency, .prn])
    }

    @Test func distanceIsSymmetricAndBounded() {
        let empty = SigCode()
        #expect(qhsPrn.distance(to: empty) == empty.distance(to: qhsPrn))
        #expect(qhsPrn.distance(to: empty) <= ComponentWeights.default.maximum)
        #expect(ComponentWeights.default.maximum == 27)
    }

    @Test func subscriptRoundTripsEveryComponent() {
        var code = SigCode()
        for component in SigComponent.allCases {
            code[component] = "X"
            #expect(code[component] == (component == .prn ? SigCode.prnCode : "X"))
        }
        #expect(code.populated.count == SigComponent.allCases.count)
        #expect(!code.isEmpty)
    }

    @Test func summaryListsPopulatedComponentsInOrder() {
        var code = qhsPrn
        code.indication = "DIZZINESS"
        #expect(code.summary == "TAKE · CAPSULE · PO · QHS · PRN · DIZZINESS")
        #expect(SigCode().summary == "—")
    }

    @Test func keyRoundTrips() {
        var code = qhsPrn
        code.indication = "DIZZINESS"
        #expect(code.key == "TAKE|CAPSULE|PO|QHS|-|PRN|DIZZINESS|-|-|-")
        #expect(SigCode(key: code.key) == code)
        #expect(SigCode(key: "-|-|-|-|-|-|-|-|-|-").isEmpty)
    }

    @Test func codesRoundTripThroughJSON() throws {
        let data = try JSONCoding.encode(qhsPrn)
        let decoded = try JSONCoding.decode(SigCode.self, from: data)
        #expect(decoded == qhsPrn)
    }
}
