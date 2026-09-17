#!/bin/zsh

set -euo pipefail

if [[ "$(uname -s)" != "Darwin" ]]; then
    echo "Kroll Label packaging runs only on macOS." >&2
    exit 1
fi

repo_root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$repo_root"

# Same toolchain fallback as harness.sh.
if [[ "$(swift --version 2>&1)" == *"not agreed"* ]]; then
    export DEVELOPER_DIR=/Library/Developer/CommandLineTools
fi

app_name="${KROLLLABEL_APP_NAME:-KrollLabel}"
bundle_identifier="${KROLLLABEL_BUNDLE_ID:-com.davidlam.krolllabel}"
version="${KROLLLABEL_VERSION:-0.1.0}"
build_number="${KROLLLABEL_BUILD_NUMBER:-$(git -C "$repo_root" rev-list --count HEAD 2>/dev/null || echo 1)}"
package_root="${KROLLLABEL_PACKAGE_ROOT:-$repo_root/output/package}"
bundle_dir="$package_root/$app_name.app"

swift build -c release --product KrollLabelApp
build_bin_dir="$(swift build -c release --show-bin-path)"

rm -rf "$bundle_dir"
mkdir -p "$bundle_dir/Contents/MacOS" "$bundle_dir/Contents/Resources"
cp "$build_bin_dir/KrollLabelApp" "$bundle_dir/Contents/MacOS/$app_name"
chmod +x "$bundle_dir/Contents/MacOS/$app_name"

# The seed sheets live in the library's SPM resource bundle. It goes under
# Contents/Resources so the .app root stays sealed; ResourceBundle.swift
# looks there first.
spm_resource_bundle="$build_bin_dir/KrollLabel_TranslationCore.bundle"
if [[ -d "$spm_resource_bundle" ]]; then
    cp -R "$spm_resource_bundle" "$bundle_dir/Contents/Resources/"
else
    echo "ERROR: resource bundle not found at $spm_resource_bundle" >&2
    exit 1
fi

cat > "$bundle_dir/Contents/Info.plist" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleDevelopmentRegion</key>
    <string>en</string>
    <key>CFBundleDisplayName</key>
    <string>Kroll Label</string>
    <key>CFBundleExecutable</key>
    <string>$app_name</string>
    <key>CFBundleIdentifier</key>
    <string>$bundle_identifier</string>
    <key>CFBundleInfoDictionaryVersion</key>
    <string>6.0</string>
    <key>CFBundleName</key>
    <string>$app_name</string>
    <key>CFBundlePackageType</key>
    <string>APPL</string>
    <key>CFBundleShortVersionString</key>
    <string>$version</string>
    <key>CFBundleVersion</key>
    <string>$build_number</string>
    <key>LSApplicationCategoryType</key>
    <string>public.app-category.medical</string>
    <key>LSMinimumSystemVersion</key>
    <string>14.0</string>
    <key>NSHighResolutionCapable</key>
    <true/>
    <key>NSHumanReadableCopyright</key>
    <string>© 2026 David Lam</string>
    <key>NSPrincipalClass</key>
    <string>NSApplication</string>
</dict>
</plist>
PLIST

plutil -lint "$bundle_dir/Contents/Info.plist" >/dev/null

for required in "Contents/MacOS/$app_name" "Contents/Resources/KrollLabel_TranslationCore.bundle/Seed/templates.json"; do
    if [[ ! -e "$bundle_dir/$required" ]]; then
        echo "ERROR: missing $required" >&2
        exit 1
    fi
done

codesign --force --sign - "$bundle_dir" >/dev/null 2>&1 || echo "WARNING: ad-hoc codesign failed" >&2
codesign --verify --strict "$bundle_dir" 2>/dev/null && echo "signed: ad-hoc" || echo "WARNING: signature did not verify" >&2

echo "packaged: $bundle_dir (v$version build $build_number)"
