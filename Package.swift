// swift-tools-version: 6.2

import PackageDescription

let package = Package(
    name: "KrollLabel",
    defaultLocalization: "en",
    platforms: [
        .macOS(.v14),
    ],
    products: [
        .library(
            name: "TranslationCore",
            targets: ["TranslationCore"]
        ),
        .executable(
            name: "KrollLabelApp",
            targets: ["KrollLabelApp"]
        ),
    ],
    targets: [
        .target(
            name: "TranslationCore",
            resources: [
                .copy("Resources/Seed"),
            ]
        ),
        .executableTarget(
            name: "KrollLabelApp",
            dependencies: ["TranslationCore"]
        ),
        .testTarget(
            name: "TranslationCoreTests",
            dependencies: ["TranslationCore"]
        ),
        .testTarget(
            name: "KrollLabelAppTests",
            dependencies: ["KrollLabelApp", "TranslationCore"]
        ),
    ]
)
