import { defineConfig } from "wxt";
import { EventEmitter } from "node:events";

// Increase the limit to prevent MaxListenersExceededWarning from wxt's readline interface
EventEmitter.defaultMaxListeners = 50;
if (process.stdin && typeof process.stdin.setMaxListeners === "function") {
  process.stdin.setMaxListeners(50);
}
if (process.stdout && typeof process.stdout.setMaxListeners === "function") {
  process.stdout.setMaxListeners(50);
}
// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ["@wxt-dev/module-react"],
  vite: (configEnv) => ({
    define: {
      __DEV__: configEnv.mode === "development",
      __CHROME__: configEnv.browser === "chrome",
    },
  }),
  manifest: {
    name: "Bookmark Viewer",
    version: "0.0.1",
    browser_specific_settings: {
      "gecko": {
        "id": "{dacde3ba-72d1-48c5-afd3-83097c36f518}",
        "strict_min_version": "109.0",
      }
    },
    action: {
      default_icon: "/icon/48.png",
      default_popup: "popup.html",
    },
    permissions: [
      "storage",
      "tabs",
      "bookmarks",
      "scripting",
      "activeTab",
      "downloads",
      "notifications",
    ],
    host_permissions: ["<all_urls>"],
  },
  webExt: {
    disabled: true,
    // binaries: {
    //   chrome: "/usr/bin/brave-browser",
    // },
    // 使用项目下的独立目录，避免与日常使用的浏览器配置冲突
    // chromiumProfile: "./.wxt/test-profile",
  },
});
