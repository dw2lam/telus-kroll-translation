# Kroll Label

A deterministic sig-translation engine for TELUS Health **Kroll** prescription labels, with a small macOS app to exercise it.

A pharmacist types a sig — a Kroll code like `BID` or `*1C`, or free text like `1 CAP QHS PRN DIZZINESS` — and the engine returns one of the PRD's states: an **exact** match, the **closest** verified template with the difference spelled out, the **top five** candidates, a **phrasing guide**, or a plain **refusal**. The pharmacist confirms; the label prints English (unchanged) plus a supplementary label in the patient's language.

There is **no machine learning anywhere**. It is tables and arithmetic.

## How it works

| PRD step | Module | What it does |
|---|---|---|
| 0 · Verified template library | `TemplateLibrary`, `Glossary`, `LibraryQA` | Whole sentences per language with a single `[N]` dose slot, keyed by a structured `SigCode`. Each carries translator, reviewer, verified date and an append-only history. **Only `verified` rows are ever served.** A glossary keeps translators consistent and powers a QA check. |
| 1 · Capture the patient's language | (Kroll's own Language field) | A language is *launched* once it has one verified template; until then a patient in it is "captured, not yet translatable". |
| 2 · Translate | `Normalizer`, `Vocabulary`, `SigParser` | The **recognition sheet** (`vocabulary.json`, ~680 rows, CSV round-trippable) maps every surface form and edge-case spelling to a component code. `q#-#h` binds numerals; `when: form=DROP` makes `od` a right-eye route instead of once daily. Two greedy longest-match passes, one round of unambiguous single-edit typo correction, then a small inference table for what pharmacists leave implicit. |
| 3 · Handle failures | `SigCode`, `Matcher` | Distance between two sigs is a weighted count of differing components (verb 5 · form 4 · route 3 · frequency 4 · timing 2 · PRN 3 · indication 1 · duration 2 · modifier 1 · site 2; a contradiction costs double a silence). `d = 0` exact; `d ≤ 1` closest; else up to five candidates within `d ≤ 8`. Every result explains itself: *missing from template: indication DIZZINESS*. |
| 4 · Print both | `LabelRenderer` | Substitutes the dose as ASCII digits; wraps them in Unicode isolates inside right-to-left text; refuses to call a label printable while `[N]` is empty. |
| Release bar | `Evaluator` | `evalset.json` must meet top-1 ≥ 90 % and top-5 = 100 % per language, with every expected state matched, in CI. |

Drug names never reach the engine: `FieldClassifier` rejects `Euro-Fer 300mg` before parsing.

## The app

Four tabs. **Fill** is the Kroll F12 pop-up: pick language and form, type a sig, press ⌘↩, and get the state with exactly the prototype's buttons (✓ Print with translation · Not this one · None of these · None of these fit · ✗ Back to Rx) and a live label preview. **Sig Codes** is Edit › Sig Codes: the template sheet, an editor with live glossary QA, and the verify gate. **Terms** is the recognition sheet — search, add rows, import/export CSV, try a phrase. **Evaluate** runs the eval set against the bar, batch-tests pasted sigs, and shows the audit log.

The app copies the shipped sheets to `~/Library/Application Support/KrollLabel/` on first launch and edits its own copy.

## Build & run

```sh
zsh scripts/harness.sh test      # engine tests
zsh scripts/harness.sh run       # the app, from source
zsh scripts/package-app.sh       # output/package/KrollLabel.app
```

Pure SwiftPM, Swift 6, macOS 14+. No Xcode project — `open Package.swift` if you want the IDE. If Xcode's license is unaccepted on your Mac the scripts fall back to the CommandLineTools toolchain automatically.

## Data

Every non-English string in the seed sheets is **illustrative, not human-verified** — the Hindi rows are marked verified only so the flow can be exercised end to end, and each one's history says so. Replace them through the translator → reviewer gate before any real use.

## Where it comes from

The design follows the capstone PRD *The Translation Layer* (templates, never clause composition; deterministic matching; confirm every match; refuse plainly, no referral) and the Kroll User Guide 2025 (sig codes under Edit › Sig Codes; the patient Language field already drives label language). The mechanism is the same family as NCPDP Structured & Codified Sig and the RxTran / Walgreens phrase-bank patents the PRD cites.

MIT © 2026 David Lam
