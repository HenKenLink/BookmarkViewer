const fs = require('fs');
let code = fs.readFileSync('entrypoints/global/store/bookmarkSlice.ts', 'utf8');

code = code.replace(
  /        for \(const \{ bookmarkId, url \} of chunk\) \{\n          if \(!urlToBlobUrl\[url\]\) \{\n            const raw = storageData\[url\];\n            const buf = new Uint8Array\(raw\);\n            const blob = new Blob\(\[buf\.buffer\], \{ type: "image\/jpeg" \}\);\n            urlToBlobUrl\[url\] = URL\.createObjectURL\(blob\);\n          \}\n          newMap\[bookmarkId\] = urlToBlobUrl\[url\];\n        \}/g,
  `        for (const { bookmarkId, url } of chunk) {
          if (!urlToBlobUrl[url]) {
            const raw = storageData[url];
            if (Array.isArray(raw)) {
              const buf = new Uint8Array(raw);
              const blob = new Blob([buf.buffer], { type: "image/jpeg" });
              urlToBlobUrl[url] = URL.createObjectURL(blob);
            } else if (typeof raw === "string" && raw.startsWith("data:")) {
              urlToBlobUrl[url] = raw;
            }
          }
          if (urlToBlobUrl[url]) {
            newMap[bookmarkId] = urlToBlobUrl[url];
          }
        }`
);

code = code.replace(
  /      if \(raw && raw\.length > 0\) \{\n        const buf = new Uint8Array\(raw\);\n        const blob = new Blob\(\[buf\.buffer\], \{ type: "image\/jpeg" \}\);\n        const blobUrl = URL\.createObjectURL\(blob\);/g,
  `      let blobUrl = "";
      if (raw && Array.isArray(raw) && raw.length > 0) {
        const buf = new Uint8Array(raw);
        const blob = new Blob([buf.buffer], { type: "image/jpeg" });
        blobUrl = URL.createObjectURL(blob);
      } else if (typeof raw === "string" && raw.startsWith("data:")) {
        blobUrl = raw;
      }
      if (blobUrl) {`
);

// We also need to fix `unloadedItems` logic because it checks `raw && raw.length > 0`. A string also has a `.length`, so it will be caught correctly.
code = code.replace(
  /          if \(raw && raw\.length > 0\) \{\n            \/\/ Defer blob URL creation to idle time\n            pendingBlobEntries\.push\(\{ bookmarkId: bk\.id, url: purl \}\);\n          \} else \{\n            unloadedItems\.push\(\{ bookmarkId: bk\.id, pageUrl: purl, configId: config\.id, isLoaded: false \}\);\n          \}/g,
  `          if (raw && ((Array.isArray(raw) && raw.length > 0) || (typeof raw === "string" && raw.startsWith("data:")))) {
            // Defer blob URL creation to idle time
            pendingBlobEntries.push({ bookmarkId: bk.id, url: purl });
          } else {
            unloadedItems.push({ bookmarkId: bk.id, pageUrl: purl, configId: config.id, isLoaded: false });
          }`
);


fs.writeFileSync('entrypoints/global/store/bookmarkSlice.ts', code);
