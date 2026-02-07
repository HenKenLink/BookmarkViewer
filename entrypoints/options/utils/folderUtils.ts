import { BookmarkTreeNode, FetchTask, FetchConfig, BookmarkFetchItem } from "../../global/types";

/**
 * Recursively get all bookmarks (items with URLs) in a folder and its subfolders
 */
export function getAllBookmarksInFolder(
    folder: BookmarkTreeNode,
    bookmarkMap: Record<string, BookmarkTreeNode>
): BookmarkTreeNode[] {
    const bookmarks: BookmarkTreeNode[] = [];

    const traverse = (node: BookmarkTreeNode) => {
        if (!node.children) return;

        for (const child of node.children) {
            if (child.url) {
                // It's a bookmark
                bookmarks.push(child);
            } else {
                // It's a folder, traverse it
                traverse(child);
            }
        }
    };

    traverse(folder);
    return bookmarks;
}

/**
 * Create fetch tasks for given bookmarks
 * This will force re-fetch all thumbnails
 */
export function createFetchTasksForBookmarks(
    bookmarks: BookmarkTreeNode[],
    configs: FetchConfig[]
): FetchTask[] {
    const fetchTasks: FetchTask[] = [];

    for (const config of configs) {
        const { hostname, regexPattern } = config;

        const matchedBookmarks = bookmarks.filter(bk => {
            if (!bk.url) return false;

            try {
                const url = new URL(bk.url);
                // Check hostname match
                if (!url.hostname.includes(hostname)) return false;

                // Check regex pattern if provided
                if (regexPattern) {
                    const regex = new RegExp(regexPattern);
                    return regex.test(bk.url);
                }

                return true;
            } catch {
                return false;
            }
        });

        if (matchedBookmarks.length > 0) {
            const items: BookmarkFetchItem[] = matchedBookmarks.map(bk => ({
                bookmarkId: bk.id,
                pageUrl: bk.url!,
                configId: config.id,
                isLoaded: false, // Force re-fetch
            }));

            fetchTasks.push({
                config,
                items,
            });
        }
    }

    return fetchTasks;
}
