const { withDangerousMod } = require("expo/config-plugins");
const fs = require("fs");
const path = require("path");

/**
 * WorkletsPackage collision is now fixed by patching the generated
 * PackageList.java at Gradle build time in plugins/withGradle8.js.
 * This plugin is kept for backwards compatibility but no longer modifies MainApplication.
 */
function withWorkletsCore(config) {
  return config;
}

module.exports = withWorkletsCore;
