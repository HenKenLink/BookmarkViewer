const fs = require('fs');
let code = fs.readFileSync('entrypoints/background/index.ts', 'utf8');

code = code.replace(
  /async function saveThumb\(thumb: Thumb\): Promise<boolean> \{([\s\S]*?)    await browser\.storage\.local\.set\(\{\n      \[pageUrl\]: uintBuf,\n    \}\);\n    return true;\n  \} catch \(err\) \{/g,
  `async function saveThumb(thumb: Thumb): Promise<boolean> {
  const thumbUrl = thumb.thumbUrl;
  const pageUrl = thumb.pageUrl;
  try {
    let dataToSave: string;
    if (thumbUrl.startsWith("data:")) {
      dataToSave = thumbUrl;
    } else {
      const response = await fetch(thumbUrl);
      const blob = await response.blob();
      dataToSave = await blobToDataUrl(blob);
    }
    await browser.storage.local.set({
      [pageUrl]: dataToSave,
    });
    return true;
  } catch (err) {`
);

code = code.replace(
  /async function hasCoverForUrl\(url: string\): Promise<boolean> \{\n  try \{\n    const result = await browser\.storage\.local\.get\(url\);\n    const raw = result\[url\] as any;\n    return raw && Array\.isArray\(raw\) && raw\.length > 0;\n  \} catch \(_\) \{\n    return false;\n  \}/g,
  `async function hasCoverForUrl(url: string): Promise<boolean> {
  try {
    const result = await browser.storage.local.get(url);
    const raw = result[url] as any;
    return raw && ((Array.isArray(raw) && raw.length > 0) || (typeof raw === "string" && raw.startsWith("data:")));
  } catch (_) {
    return false;
  }`
);

fs.writeFileSync('entrypoints/background/index.ts', code);
