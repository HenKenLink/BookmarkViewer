import JSZip from "jszip";
import { saveAs } from "file-saver";
import { BookmarkTreeNode } from "@/entrypoints/global/types";
import { SETTINGS_KEY, CONFIGS_KEY } from "../../global/consts";

interface ManifestItem {
    filename: string;
    bookmarkUrl: string;
}

export const exportAll = async (onProgress?: (msg: string) => void) => {
    try {
        if (onProgress) onProgress("Preparing backup...");
        const zip = new JSZip();
        const manifest: ManifestItem[] = [];
        const images = zip.folder("images");

        if (onProgress) onProgress("Fetching storage data...");
        const allData = await browser.storage.local.get(null);
        let coverCount = 0;

        const settingsData: Record<string, any> = {};
        if (allData[SETTINGS_KEY]) settingsData[SETTINGS_KEY] = allData[SETTINGS_KEY];
        if (allData[CONFIGS_KEY]) settingsData[CONFIGS_KEY] = allData[CONFIGS_KEY];

        zip.file("settings.json", JSON.stringify(settingsData, null, 2));

        if (onProgress) onProgress("Packing covers...");
        for (const [key, value] of Object.entries(allData)) {
            if (key === SETTINGS_KEY || key === CONFIGS_KEY) continue;
            // Covers are arrays of numbers (converted from Uint8Array in previous saves)
            if (Array.isArray(value) && value.length > 0) {
                const filename = `${coverCount}.jpg`;
                const u8 = new Uint8Array(value as number[]);
                if (images) {
                    images.file(filename, u8);
                    manifest.push({ filename, bookmarkUrl: key });
                    coverCount++;
                }
            }
        }

        if (coverCount > 0) {
            zip.file("manifest.json", JSON.stringify(manifest, null, 2));
        }

        if (onProgress) onProgress(`Generating ZIP with ${coverCount} covers...`);
        const content = await zip.generateAsync({ type: "blob" });
        saveAs(content, `bookmark-full-backup-${new Date().toISOString().split('T')[0]}.zip`);
        if (onProgress) onProgress("Backup complete.");
    } catch (e) {
        console.error("Backup failed:", e);
        alert("Export failed: " + (e as Error).message);
    }
};

export const importFile = async (
    file: File,
    bookmarkMap: Record<string, BookmarkTreeNode>,
    onProgress?: (msg: string) => void
) => {
    if (file.name.endsWith(".json")) {
        await importSettings(file, onProgress);
    } else if (file.name.endsWith(".zip")) {
        await importZip(file, bookmarkMap, onProgress);
    } else {
        alert("Unsupported file type. Please provide a .json or .zip file.");
    }
};

const importSettings = async (file: File, onProgress?: (msg: string) => void) => {
    try {
        const text = await file.text();
        const data = JSON.parse(text);
        if (data[SETTINGS_KEY] || data[CONFIGS_KEY]) {
            await browser.storage.local.set(data);
            if (onProgress) onProgress("Settings imported successfully. Refreshing...");
            setTimeout(() => {
                window.location.reload();
            }, 500);
        } else {
            throw new Error("Invalid settings file.");
        }
    } catch (e) {
        console.error(e);
        alert("Import failed: " + (e as Error).message);
    }
};

const importZip = async (
    file: File,
    _bookmarkMap: Record<string, BookmarkTreeNode>,
    onProgress?: (msg: string) => void
) => {
    try {
        if (onProgress) onProgress("Loading ZIP file...");
        const zip = await JSZip.loadAsync(file);
        const manifestFile = zip.file("manifest.json");
        const settingsFile = zip.file("settings.json");

        if (!manifestFile && !settingsFile) {
            throw new Error("Invalid backup: No manifest.json or settings.json found.");
        }

        const updates: Record<string, any> = {};

        if (settingsFile) {
            if (onProgress) onProgress("Parsing settings...");
            const settingsContent = await settingsFile.async("string");
            const settingsData = JSON.parse(settingsContent);
            Object.assign(updates, settingsData);
        }

        if (manifestFile) {
            if (onProgress) onProgress("Parsing covers...");
            const manifestContent = await manifestFile.async("string");
            const manifest: ManifestItem[] = JSON.parse(manifestContent);

            for (const item of manifest) {
                const imageFile = zip.file(`images/${item.filename}`);
                if (imageFile) {
                    const u8 = await imageFile.async("uint8array");
                    updates[item.bookmarkUrl] = Array.from(u8);
                }
            }
        }

        if (Object.keys(updates).length > 0) {
            if (onProgress) onProgress("Saving to storage...");
            await browser.storage.local.set(updates);
            if (onProgress) onProgress("Import successful. Refreshing...");
            setTimeout(() => {
                window.location.reload();
            }, 500);
        } else {
            if (onProgress) onProgress("No valid data found in backup.");
        }
    } catch (e) {
        console.error(e);
        alert("Import failed: " + (e as Error).message);
    }
};
