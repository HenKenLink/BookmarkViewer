const fs = require('fs');
let code = fs.readFileSync('entrypoints/viewer/utils/thumbnailUtils.ts', 'utf8');

code = code.replace(
  /        \/\/ Read file as array buffer\n        const arrayBuffer = await file\.arrayBuffer\(\);\n        const uint8Array = new Uint8Array\(arrayBuffer\);\n\n        \/\/ Save to storage\n        await browser\.storage\.local\.set\(\{\n            \[pageUrl\]: Array\.from\(uint8Array\)\n        \}\);\n\n        \/\/ Create blob URL for immediate display\n        const blob = new Blob\(\[uint8Array\], \{ type: file\.type \}\);\n        const blobUrl = URL\.createObjectURL\(blob\);/g,
  `        // Convert file to data URL
        const reader = new FileReader();
        const dataUrl = await new Promise<string>((resolve, reject) => {
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });

        // Save to storage
        await browser.storage.local.set({
            [pageUrl]: dataUrl
        });

        // Create blob URL for immediate display (or just use dataUrl)
        const blobUrl = dataUrl;`
);

fs.writeFileSync('entrypoints/viewer/utils/thumbnailUtils.ts', code);
