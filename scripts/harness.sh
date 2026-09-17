#!/bin/zsh

set -euo pipefail

repo_root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$repo_root"

# Toolchain: prefer Xcode's. If its license is unaccepted, fall back to the
# CommandLineTools toolchain and hand SwiftPM the Swift Testing framework path
# and rpaths it does not add on its own there.
swift_flags=()
if [[ "$(swift --version 2>&1)" == *"not agreed"* ]]; then
    export DEVELOPER_DIR=/Library/Developer/CommandLineTools
    clt=/Library/Developer/CommandLineTools/Library/Developer
    swift_flags=(
        -Xswiftc -F -Xswiftc "$clt/Frameworks"
        -Xlinker -F -Xlinker "$clt/Frameworks"
        -Xlinker -rpath -Xlinker "$clt/Frameworks"
        -Xlinker -rpath -Xlinker "$clt/usr/lib"
    )
    echo "==> using CommandLineTools toolchain (Xcode license not accepted)"
fi

if (( $# == 0 )); then
    steps=(test build)
else
    steps=("$@")
fi

run_step() {
    local step="$1"

    case "$step" in
        build)
            echo "==> build"
            swift build
            ;;
        build-tests)
            echo "==> build-tests"
            swift build --build-tests "${swift_flags[@]}"
            ;;
        test)
            echo "==> test"
            swift test "${swift_flags[@]}"
            ;;
        run)
            echo "==> run"
            swift run KrollLabelApp
            ;;
        ci)
            run_step test
            run_step build
            ;;
        all)
            run_step test
            run_step build
            ;;
        *)
            echo "usage: scripts/harness.sh [build|build-tests|test|run|ci|all] ..." >&2
            exit 64
            ;;
    esac
}

for step in "${steps[@]}"; do
    run_step "$step"
done
