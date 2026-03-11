import JSZip from "jszip";
import { saveAs } from "file-saver";
import { BookmarkTreeNode } from "@/entrypoints/global/types";
import { SETTINGS_KEY, CONFIGS_KEY } from "../consts";

interface ManifestItem {
    filename: string;
    bookmarkUrl: string;
}

export const exportAll = async () => {
    const zip = new JSZip();
    const manifest: ManifestItem[] = [];
    const images = zip.folder("images");

    const allData = await browser.storage.local.get(null);
    let coverCount = 0;

    const settingsData: Record<string, any> = {};
    if (allData[SETTINGS_KEY]) settingsData[SETTINGS_KEY] = allData[SETTINGS_KEY];
    if (allData[CONFIGS_KEY]) settingsData[CONFIGS_KEY] = allData[CONFIGS_KEY];

    zip.file("settings.json", JSON.stringify(settingsData, null, 2));

    for (const [key, value] of Object.entries(allData)) {
        if (key === SETTINGS_KEY || key === CONFIGS_KEY) continue;
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

    const content = await zip.generateAsync({ type: "blob" });
    saveAs(content, `bookmark-full-backup-${new Date().toISOString().split('T')[0]}.zip`);
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
            window.location.reload();
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
    bookmarkMap: Record<string, BookmarkTreeNode>,
    onProgress?: (msg: string) => void
) => {
    try {
        const zip = await JSZip.loadAsync(file);
        const manifestFile = zip.file("manifest.json");
        const settingsFile = zip.file("settings.json");

        if (!manifestFile && !settingsFile) {
            throw new Error("Invalid backup: No manifest.json or settings.json found.");
        }

        const updates: Record<string, any> = {};

        if (settingsFile) {
            const settingsContent = await settingsFile.async("string");
            const settingsData = JSON.parse(settingsContent);
            Object.assign(updates, settingsData);
        }

        if (manifestFile) {
            const manifestContent = await manifestFile.async("string");
            const manifest: ManifestItem[] = JSON.parse(manifestContent);

            const existingUrls = new Set<string>();
            Object.values(bookmarkMap).forEach(node => {
                if (node.url) existingUrls.add(node.url);
            });

            for (const item of manifest) {
                if (!existingUrls.has(item.bookmarkUrl)) continue;
                const imageFile = zip.file(`images/${item.filename}`);
                if (imageFile) {
                    const u8 = await imageFile.async("uint8array");
                    updates[item.bookmarkUrl] = Array.from(u8);
                }
            }
        }

        if (Object.keys(updates).length > 0) {
            await browser.storage.local.set(updates);
            if (onProgress) onProgress("Import completed successfully. Refreshing...");
            window.location.reload();
        } else {
            if (onProgress) onProgress("No data imported.");
        }
    } catch (e) {
        console.error(e);
        alert("Import failed: " + (e as Error).message);
    }
};
