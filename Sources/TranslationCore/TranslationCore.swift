/// TranslationCore — a deterministic, table-driven engine that turns a pharmacist's
/// typed prescription instruction (a "sig") into a human-verified translated template.
///
/// There is no machine learning anywhere in this module: a recognition sheet maps
/// surface forms to component codes, a parser assembles them into a `SigCode`, and
/// templates are whole verified sentences keyed by that code.
public enum TranslationCoreInfo {
    public static let version = "0.1.0"
}
