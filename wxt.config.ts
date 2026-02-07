import { defineConfig } from "wxt";

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
    binaries: {
      chrome: "/usr/bin/brave-browser",
    },
  },
});
