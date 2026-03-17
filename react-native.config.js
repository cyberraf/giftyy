/**
 * WorkletsPackage name collision is resolved by patching the generated
 * PackageList.java at build time (see plugins/withGradle8.js).
 * We do not exclude any package so Reanimated and Vision Camera both build.
 */
module.exports = {};
