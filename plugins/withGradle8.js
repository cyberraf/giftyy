const { withDangerousMod } = require("expo/config-plugins");
const fs = require("fs");
const path = require("path");

const KOTLIN_VERSION = "2.0.21";

/**
 * Config plugin to fix Android build for Expo 55 + RN 0.83:
 * - Pin Gradle to 8.13 (AGP requires 8.13+; avoid Gradle 9 for RN compatibility)
 * - Add kotlinVersion 2.0.21 (required by KSP)
 * - Fix getAbsolutePath() on null when Node resolution fails in app/build.gradle
 */
function withGradle8(config) {
  return withDangerousMod(config, [
    "android",
    async (config) => {
      const platformRoot = config.modRequest.platformProjectRoot;

      // 1. Pin Gradle to 8.10.2
      const gradleWrapperPath = path.join(
        platformRoot,
        "gradle",
        "wrapper",
        "gradle-wrapper.properties"
      );
      if (fs.existsSync(gradleWrapperPath)) {
        let contents = fs.readFileSync(gradleWrapperPath, "utf8");
        contents = contents.replace(
          /distributionUrl=.*/,
          "distributionUrl=https\\://services.gradle.org/distributions/gradle-8.13-bin.zip"
        );
        fs.writeFileSync(gradleWrapperPath, contents);
      }

      // 2. Add kotlinVersion to root build.gradle ext block (required by expo-root-project/KSP)
      const buildGradlePath = path.join(platformRoot, "build.gradle");
      if (fs.existsSync(buildGradlePath)) {
        let contents = fs.readFileSync(buildGradlePath, "utf8");
        if (!/kotlinVersion\s*=/.test(contents)) {
          if (/buildscript\s*\{[^}]*ext\s*\{/.test(contents)) {
            contents = contents.replace(/ext\s*\{/, `ext {\n    kotlinVersion = "${KOTLIN_VERSION}"`);
          } else if (/buildscript\s*\{/.test(contents)) {
            contents = contents.replace(
              /buildscript\s*\{/,
              `buildscript {\n  ext {\n    kotlinVersion = "${KOTLIN_VERSION}"\n  }\n  `
            );
          }
        }
        // 2b. Substitute only 1.9.24 -> 2.0.21 (expo-dev-launcher requests 1.9.24 which doesn't exist).
        // Do NOT force globally - stripe-react-native needs its own Compose compiler version.
        if (!contents.includes("kotlin-compose-compiler-plugin-embeddable")) {
          const resolutionBlock = `
allprojects {
    configurations.all {
        resolutionStrategy {
            eachDependency { details ->
                if (details.requested.group == "org.jetbrains.kotlin" && details.requested.name == "kotlin-compose-compiler-plugin-embeddable" && details.requested.version == "1.9.24") {
                    details.useVersion("${KOTLIN_VERSION}")
                    details.because("1.9.24 does not exist in Maven Central")
                }
            }
        }
    }
}
`;
          contents = contents + "\n" + resolutionBlock;
        }
        fs.writeFileSync(buildGradlePath, contents);
      }

      // 3. Fix app/build.gradle: Node resolution can return empty, causing getAbsolutePath() on null.
      // Use projectRoot + node_modules path as fallback when Node execute returns empty.
      const appBuildGradlePath = path.join(platformRoot, "app", "build.gradle");
      if (fs.existsSync(appBuildGradlePath)) {
        let contents = fs.readFileSync(appBuildGradlePath, "utf8");
        const rnResolve = '["node", "--print", "require.resolve(\'react-native/package.json\')"].execute(null, rootDir).text.trim()';
        const rnFallback = 'projectRoot + "/node_modules/react-native"';
        const codegenResolve = '["node", "--print", "require.resolve(\'@react-native/codegen/package.json\', { paths: [require.resolve(\'react-native/package.json\')] })"].execute(null, rootDir).text.trim()';
        const codegenFallback = 'projectRoot + "/node_modules/@react-native/codegen"';
        const cliResolve = '["node", "--print", "require.resolve(\'@expo/cli\', { paths: [require.resolve(\'expo/package.json\')] })"].execute(null, rootDir).text.trim()';
        const cliFallback = 'projectRoot + "/node_modules/@expo/cli"';
        const hermesResolve = '["node", "--print", "require.resolve(\'hermes-compiler/package.json\', { paths: [require.resolve(\'react-native/package.json\')] })"].execute(null, rootDir).text.trim()';

        contents = contents.replace(
          "reactNativeDir = new File(" + rnResolve + ").getParentFile().getAbsoluteFile()",
          "reactNativeDir = { def p = " + rnResolve + "; p ? new File(p).getParentFile()?.getAbsoluteFile() ?: new File(" + rnFallback + ") : new File(" + rnFallback + ") }()"
        );
        if (contents.includes("hermes-compiler/package.json")) {
          contents = contents.replace(
            "hermesCommand = new File(" + hermesResolve + ").getParentFile().getAbsolutePath() + \"/hermesc/%OS-BIN%/hermesc\"",
            'hermesCommand = { def p = ' + hermesResolve + '; p ? new File(p).getParentFile()?.getAbsolutePath() + "/hermesc/%OS-BIN%/hermesc" : projectRoot + "/node_modules/hermes-compiler/hermesc/%OS-BIN%/hermesc" }()'
          );
        } else {
          contents = contents.replace(
            'hermesCommand = new File(' + rnResolve + ').getParentFile().getAbsolutePath() + "/sdks/hermesc/%OS-BIN%/hermesc"',
            'hermesCommand = { def p = ' + rnResolve + '; p ? new File(p).getParentFile()?.getAbsolutePath() + "/sdks/hermesc/%OS-BIN%/hermesc" : ' + rnFallback + ' + "/sdks/hermesc/%OS-BIN%/hermesc" }()'
          );
        }
        contents = contents.replace(
          "codegenDir = new File(" + codegenResolve + ").getParentFile().getAbsoluteFile()",
          "codegenDir = { def p = " + codegenResolve + "; p ? new File(p).getParentFile()?.getAbsoluteFile() ?: new File(" + codegenFallback + ") : new File(" + codegenFallback + ") }()"
        );
        contents = contents.replace(
          "cliFile = new File(" + cliResolve + ")",
          "cliFile = { def p = " + cliResolve + "; p ? new File(p) : new File(" + cliFallback + ") }()"
        );
        // 4. Remove enableBundleCompression - removed from React Native gradle plugin (RN 0.74+)
        contents = contents.replace(
          /enableBundleCompression = \(findProperty\('android\.enableBundleCompression'\) \?: false\)\.toBoolean\(\)\n\s*/g,
          ""
        );
        fs.writeFileSync(appBuildGradlePath, contents);
      }

      return config;
    },
  ]);
}

module.exports = withGradle8;
