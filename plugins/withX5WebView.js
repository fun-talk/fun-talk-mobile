const {
  withAppBuildGradle,
  withMainApplication,
  withAndroidManifest,
  withDangerousMod,
} = require("expo/config-plugins");
const fs = require("fs");
const path = require("path");

function withX5Gradle(config) {
  return withAppBuildGradle(config, (config) => {
    const contents = config.modResults.contents;
    if (!contents.includes("com.tencent.tbs:tbssdk")) {
      config.modResults.contents = contents.replace(
        'implementation("com.facebook.react:react-android")',
        'implementation("com.facebook.react:react-android")\n    implementation("com.tencent.tbs:tbssdk:44286")'
      );
    }
    return config;
  });
}

function withX5MainApplication(config) {
  return withMainApplication(config, (config) => {
    let contents = config.modResults.contents;

    if (contents.includes("QbSdk")) return config;

    // Add imports
    contents = contents.replace(
      "import expo.modules.ApplicationLifecycleDispatcher",
      `import com.tencent.smtt.export.external.TbsCoreSettings
import com.tencent.smtt.sdk.QbSdk
import java.io.File
import java.io.FileOutputStream

import expo.modules.ApplicationLifecycleDispatcher`
    );

    // Add initX5WebView() call in onCreate
    contents = contents.replace(
      "loadReactNative(this)",
      `initX5WebView()

    loadReactNative(this)`
    );

    // Add helper methods before the last closing brace
    const initMethod = `
  private fun initX5WebView() {
    val settings = HashMap<String, Any>()
    settings[TbsCoreSettings.TBS_SETTINGS_USE_SPEEDY_CLASSLOADER] = true
    settings[TbsCoreSettings.TBS_SETTINGS_USE_DEXLOADER_SERVICE] = true
    QbSdk.initTbsSettings(settings)

    if (!QbSdk.canLoadX5(applicationContext)) {
      installOfflineX5Core()
    }

    QbSdk.initX5Environment(applicationContext, object : QbSdk.PreInitCallback {
      override fun onCoreInitFinished() {
        android.util.Log.i("X5WebView", "X5 core init finished")
      }

      override fun onViewInitFinished(isX5Core: Boolean) {
        android.util.Log.i("X5WebView", "X5 view init finished, isX5Core=\$isX5Core")
      }
    })
  }

  private fun installOfflineX5Core() {
    try {
      val tbsDir = File(filesDir.parentFile, "app_tbs")
      if (!tbsDir.exists()) tbsDir.mkdirs()

      val is64Bit = android.os.Build.SUPPORTED_ABIS.any { it.contains("arm64") }
      val assetName = if (is64Bit) "x5_core_64.apk" else "x5_core_32.apk"
      val coreVersion = if (is64Bit) 46239 else 46238

      val coreFile = File(tbsDir, assetName)
      if (!coreFile.exists()) {
        assets.open(assetName).use { input ->
          FileOutputStream(coreFile).use { output ->
            input.copyTo(output)
          }
        }
        android.util.Log.i("X5WebView", "Copied offline X5 core (\$assetName)")
      }

      QbSdk.reset(applicationContext)
      QbSdk.installLocalTbsCore(applicationContext, coreVersion, coreFile.absolutePath)
      android.util.Log.i("X5WebView", "Installed offline X5 core v\$coreVersion")
    } catch (e: Exception) {
      android.util.Log.e("X5WebView", "Failed to install offline X5 core", e)
    }
  }
`;

    const lastBrace = contents.lastIndexOf("}");
    contents =
      contents.substring(0, lastBrace) + initMethod + "\n" + contents.substring(lastBrace);

    config.modResults.contents = contents;
    return config;
  });
}

function withX5Manifest(config) {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest;
    const permissions = manifest["uses-permission"] || [];

    const needed = [
      "android.permission.ACCESS_NETWORK_STATE",
      "android.permission.ACCESS_WIFI_STATE",
    ];

    for (const perm of needed) {
      if (!permissions.some((p) => p.$?.["android:name"] === perm)) {
        permissions.push({ $: { "android:name": perm } });
      }
    }

    manifest["uses-permission"] = permissions;
    return config;
  });
}

function withX5Assets(config) {
  return withDangerousMod(config, [
    "android",
    async (config) => {
      const assetsDir = path.join(
        config.modRequest.platformProjectRoot,
        "app",
        "src",
        "main",
        "assets"
      );
      fs.mkdirSync(assetsDir, { recursive: true });

      const projectRoot = config.modRequest.projectRoot;
      let missing = [];
      for (const file of ["x5_core_64.apk", "x5_core_32.apk"]) {
        const src = path.join(projectRoot, "assets", "x5", file);
        const dst = path.join(assetsDir, file);
        if (fs.existsSync(src)) {
          fs.copyFileSync(src, dst);
        } else {
          missing.push(file);
        }
      }
      if (missing.length > 0) {
        console.warn(
          `\n⚠️  X5 offline kernel not found: ${missing.join(", ")}\n` +
          `   Run: bash scripts/download-x5-core.sh\n`
        );
      }
      return config;
    },
  ]);
}

function withX5Proguard(config) {
  return withDangerousMod(config, [
    "android",
    async (config) => {
      const proguardPath = path.join(
        config.modRequest.platformProjectRoot,
        "app",
        "proguard-rules.pro"
      );
      if (fs.existsSync(proguardPath)) {
        let contents = fs.readFileSync(proguardPath, "utf8");
        if (!contents.includes("com.tencent.smtt")) {
          contents += `
# Tencent TBS X5 WebView
-dontwarn dalvik.**
-dontwarn com.tencent.smtt.**
-keep class com.tencent.smtt.** { *; }
-keep class com.tencent.tbs.** { *; }
`;
          fs.writeFileSync(proguardPath, contents);
        }
      }
      return config;
    },
  ]);
}

module.exports = function withX5WebView(config) {
  config = withX5Gradle(config);
  config = withX5MainApplication(config);
  config = withX5Manifest(config);
  config = withX5Assets(config);
  config = withX5Proguard(config);
  return config;
};
