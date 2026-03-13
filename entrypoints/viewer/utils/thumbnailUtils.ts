/**
 * Download a thumbnail as a file
 */
export async function downloadThumbnailAsFile(
    blobUrl: string,
    filename: string
): Promise<void> {
    try {
        const response = await fetch(blobUrl);
        const blob = await response.blob();

        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    } catch (error) {
        console.error('Failed to download thumbnail:', error);
        throw error;
    }
}

/**
 * Upload a thumbnail file and save it to storage
 */
export async function uploadThumbnailFile(
    file: File,
    pageUrl: string
): Promise<string> {
    try {
        // Convert file to data URL
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
        const blobUrl = dataUrl;

        return blobUrl;
    } catch (error) {
        console.error('Failed to upload thumbnail:', error);
        throw error;
    }
}

/**
 * Download multiple thumbnails as a zip file
 * For simplicity, we'll download them individually
 */
export async function downloadMultipleThumbnails(
    thumbnails: Array<{ blobUrl: string; filename: string }>
): Promise<void> {
    for (const { blobUrl, filename } of thumbnails) {
        await downloadThumbnailAsFile(blobUrl, filename);
        // Add a small delay between downloads to avoid browser issues
        await new Promise(resolve => setTimeout(resolve, 100));
    }
}
