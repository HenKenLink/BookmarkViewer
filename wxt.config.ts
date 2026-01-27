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
    version: "0.0.12",
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
    ],
    host_permissions: ["<all_urls>"],
  },
  webExt: {
    browserConsole: true,
    binaries: {
      chrome: "/usr/bin/brave-browser",
      firefox: "/usr/bin/librewolf",
    },
  },
});
