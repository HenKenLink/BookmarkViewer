import JSZip from "jszip";
import { saveAs } from "file-saver";
import { BookmarkTreeNode } from "@/entrypoints/global/types";

interface ManifestItem {
    filename: string;
    bookmarkUrl: string;
}

export const exportCovers = async () => {
    const zip = new JSZip();
    const manifest: ManifestItem[] = [];
    const images = zip.folder("images");

    const allData = await browser.storage.local.get(null);
    let count = 0;

    for (const [key, value] of Object.entries(allData)) {
        // Value is stored as number[] (serialized Uint8Array) in storage
        if (Array.isArray(value) && value.length > 0) {
            const filename = `${count}.jpg`;
            // Convert number[] back to Uint8Array for jszip
            const u8 = new Uint8Array(value as number[]);

            if (images) {
                images.file(filename, u8);
                manifest.push({ filename, bookmarkUrl: key });
                count++;
            }
        }
    }

    if (count === 0) {
        alert("No covers found to export.");
        return;
    }

    zip.file("manifest.json", JSON.stringify(manifest, null, 2));

    const content = await zip.generateAsync({ type: "blob" });
    saveAs(content, `bookmark-covers-${new Date().toISOString().split('T')[0]}.zip`);
};

export const importCovers = async (
    file: File,
    bookmarkMap: Record<string, BookmarkTreeNode>,
    onProgress?: (msg: string) => void
) => {
    try {
        const zip = await JSZip.loadAsync(file);
        const manifestFile = zip.file("manifest.json");

        if (!manifestFile) {
            throw new Error("Invalid backup: manifest.json missing");
        }

        const manifestContent = await manifestFile.async("string");
        const manifest: ManifestItem[] = JSON.parse(manifestContent);

        const updates: Record<string, any> = {};
        let importedCount = 0;
        let skippedCount = 0;

        // Build a set of all URLs in the current bookmark tree for fast lookup
        const existingUrls = new Set<string>();
        Object.values(bookmarkMap).forEach(node => {
            if (node.url) existingUrls.add(node.url);
        });

        for (const item of manifest) {
            if (!existingUrls.has(item.bookmarkUrl)) {
                skippedCount++;
                continue;
            }

            const imageFile = zip.file(`images/${item.filename}`);
            if (imageFile) {
                const u8 = await imageFile.async("uint8array");
                // Store as number[] to match background script format
                updates[item.bookmarkUrl] = Array.from(u8);
                importedCount++;
            }
        }

        if (importedCount > 0) {
            await browser.storage.local.set(updates);
            if (onProgress) onProgress(`Restored ${importedCount} covers. Skipped ${skippedCount}.`);
            window.location.reload(); // Simple reload to refresh store 
        } else {
            if (onProgress) onProgress(`No matching bookmarks found. Skipped ${skippedCount}.`);
        }

    } catch (e) {
        console.error(e);
        alert("Import failed: " + (e as Error).message);
    }
};
