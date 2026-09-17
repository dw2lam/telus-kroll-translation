import Testing
@testable import TranslationCore

struct SmokeTests {
    @Test func versionIsSet() {
        #expect(!TranslationCoreInfo.version.isEmpty)
    }
}
