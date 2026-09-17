import Testing
@testable import TranslationCore

struct MatcherTests {
    let matcher = Matcher(library: try! TemplateLibrary.seed(), vocabulary: try! Vocabulary.seed(), glossary: try! Glossary.seed())

    func result(_ sig: String, _ language: LanguageCode = .hi, _ form: DosageForm = .capsule) -> MatchResult {
        matcher.match(sig, language: language, form: form).result
    }

    // State 1
    @Test func krollCodesAreExact() {
        for code in ["BID", "bid", "QHS PRN", "qhs prn", "UD", "PRN"] {
            guard case .exact(let c, let via) = result(code) else { Issue.record("\(code) not exact"); continue }
            #expect(c.distance == 0 && c.confidence == 1)
            #expect(via == .krollCode(code.uppercased()))
        }
        #expect(result("BID").best?.id == "bid.capsule")
        #expect(result("QHS PRN").best?.id == "qhs-prn.capsule")
    }

    @Test func leadingDoseAndImpliedDose() {
        guard case .exact(let c, _) = result("2 BID") else { Issue.record("not exact"); return }
        #expect(c.dose == Dose("2"))
        guard case .exact(let star, let via) = result("*1C") else { Issue.record("not exact"); return }
        #expect(star.id == "qd.capsule")
        #expect(star.dose == Dose("1"))
        #expect(via == .krollCode("*1C"))
    }

    @Test func freeTextExactBySigCode() {
        guard case .exact(let c, let via) = result("take 2 capsules by mouth twice daily") else { Issue.record("not exact"); return }
        #expect(via == .sigCode)
        #expect(c.id == "bid.capsule")
        #expect(c.dose == Dose("2"))
        #expect(c.diff.isEmpty)
        #expect(c.confidence == 1)
        guard case .exact(let ud, _) = result("use as directed", .hi, .any) else { Issue.record("not exact"); return }
        #expect(ud.id == "ud.any")
        #expect(ud.dose == nil)
    }

    // State 2
    @Test func figmaDemoSigIsClosest() {
        let out = matcher.match("1 CAP QHS PRN DIZZINESS", language: .hi, form: .capsule)
        guard case .closest(let c, let rest) = out.result else { Issue.record("not closest: \(out.result)"); return }
        #expect(c.id == "qhs-prn.capsule")
        #expect(c.distance == 1)
        #expect(c.diff.count == 1)
        #expect(c.diff.first?.component == .indication)
        #expect(c.explanation == "missing from template: indication DIZZINESS")
        #expect(c.dose == Dose("1"))
        #expect(c.confidence > 0.9)
        #expect(rest.first?.id == "qhs-prn-sleep.capsule")
        #expect(rest.map(\.distance) == rest.map(\.distance).sorted())
        #expect(rest.count <= 4)
        #expect(!out.guide.isEmpty)
    }

    // State 3
    @Test func everyMorningHasNoTemplateSoCandidates() {
        guard case .candidates(let list) = result("TAKE ONE CAPSULE EVERY MORNING") else { Issue.record("not candidates"); return }
        #expect(!list.isEmpty && list.count <= 5)
        #expect(list.map(\.distance) == list.map(\.distance).sorted())
        #expect(list.allSatisfy { $0.distance > 1 && $0.distance <= 8 })
        #expect(list.allSatisfy { $0.dose == Dose("1") })
        #expect(list.allSatisfy { !$0.diff.isEmpty })
    }

    @Test func topicalSigRanksTheTopicalTemplate() {
        guard case .candidates(let list) = result("apply sparingly to irritated skin", .hi, .topical) else { Issue.record("not candidates"); return }
        #expect(list.first?.id == "aa.topical")
        #expect(list.first?.distance == 5)
        #expect(list.first?.diff.map(\.component) == [.frequency, .modifier])
    }

    @Test func pendingTemplatesNeverAppear() {
        for form in [DosageForm.capsule, .any] {
            let ranked = result("take 1 capsule four times daily", .hi, form).ranked
            #expect(!ranked.isEmpty)
            #expect(!ranked.contains { $0.id == "qid.capsule" })
        }
        #expect(result("QID").stateNumber != 1)
    }

    @Test func formPrefilterExcludesOtherForms() {
        let ranked = result("apply twice daily to affected area", .hi, .capsule).ranked
        #expect(!ranked.contains { $0.id == "aa.topical" })
        #expect(result("1 cap bid", .hi, .capsule).best?.id == "bid.capsule")
        #expect(result("1 cap bid", .hi, .tablet).best?.id != "bid.capsule")
    }

    // State 5 (engine side)
    @Test func refusals() {
        guard case .refused(.noCloseTemplate(let best)) = result("1-2 tabs po q4-6h prn pain", .hi, .tablet) else { Issue.record("not refused"); return }
        #expect((best ?? 0) > 8)
        guard case .refused(.ambiguous(let amb)) = result("1 cap bid tid") else { Issue.record("not ambiguous"); return }
        #expect(amb.first?.component == .frequency)
        guard case .refused(.nothingRecognised) = result("zzz qqq www") else { Issue.record("not nothingRecognised"); return }
        for reason in [RefusalReason.nothingRecognised, .ambiguous(amb), .noCloseTemplate(best: 12)] {
            let text = matcher.refusalText(reason, language: .hi).lowercased()
            #expect(text.contains("english only"))
            for banned in ["contact", "ask", "refer"] { #expect(!text.contains(banned), "\(banned)") }
        }
        #expect(!matcher.refusalText(language: .hi).lowercased().contains("refer"))
    }

    // Other exits
    @Test func notYetTranslatableAndRejected() {
        #expect(result("BID", .tl) == .notYetTranslatable(language: .tl))
        #expect(result("take 1 capsule daily", .ar) == .notYetTranslatable(language: .ar))
        #expect(result("Amoxicillin 500mg") == .rejected(.looksLikeDrugName))
        #expect(result("") == .rejected(.empty))
        #expect(result("   ") == .rejected(.empty))
    }

    @Test func guideFollowsVerbAndForm() {
        let capsule = matcher.match("1 cap bid", language: .hi, form: .capsule).guide.map(\.id)
        #expect(capsule.count == 9 && !capsule.contains("aa.topical") && !capsule.contains("ud.any"))
        let topical = matcher.match("apply bid", language: .hi, form: .topical).guide.map(\.id)
        #expect(topical == ["aa.topical"])
        let any = matcher.match("BID", language: .hi, form: .any).guide.count
        #expect(any == 11)
    }

    @Test func deterministic() {
        let a = matcher.match("1 CAP QHS PRN DIZZINESS", language: .hi, form: .capsule)
        let b = matcher.match("1 CAP QHS PRN DIZZINESS", language: .hi, form: .capsule)
        #expect(a == b)
        let out = matcher.match("1 CAP QHS PRN DIZZINESS", language: .hi, form: .capsule)
        for c in out.result.ranked { #expect(c.confidence >= 0 && c.confidence <= 1) }
    }
}
