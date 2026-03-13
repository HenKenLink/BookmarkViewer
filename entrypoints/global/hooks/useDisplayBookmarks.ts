import { useMemo } from "react";
import { BookmarkTreeNode, Setting } from "../types";
import { sortBookmarks, filterByUrlDomains } from "../sortFilterUtils";
import { BookmarkMap } from "../store/bookmarkSlice";

export type DisplayItem = {
  type: "bookmark" | "folder";
  data: BookmarkTreeNode;
};

export function useDisplayBookmarks(
  bookmarkTree: BookmarkTreeNode | null,
  matchedBookmarks: BookmarkTreeNode[],
  bookmarkMap: BookmarkMap,
  selectedFolderId: string,
  searchQuery: string,
  setting: Setting
) {
  // Memoize the parent map independently. It only changes if the tree changes.
  const parentMap = useMemo(() => {
    const map: Record<string, string> = {};
    const build = (node: BookmarkTreeNode) => {
      if (node.children) {
        node.children.forEach((child) => {
          map[child.id] = node.id;
          build(child);
        });
      }
    };
    if (bookmarkTree) build(bookmarkTree);
    return map;
  }, [bookmarkTree]);

  // Convert matchedBookmarks to a Set for O(1) lookup
  const matchedBookmarkIds = useMemo(() => {
    return new Set(matchedBookmarks.map(bk => bk.id));
  }, [matchedBookmarks]);

  // Identify folders that contain matched bookmarks in their subtree
  const matchedFolderIds = useMemo(() => {
    const ids = new Set<string>();
    matchedBookmarks.forEach((bk) => {
      let currentId = parentMap[bk.id];
      while (currentId) {
        if (ids.has(currentId)) break; // already traversed
        ids.add(currentId);
        currentId = parentMap[currentId];
      }
    });
    return ids;
  }, [parentMap, matchedBookmarks]);

  const folderCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    matchedBookmarks.forEach((bk) => {
      let currentId = parentMap[bk.id];
      while (currentId) {
        counts[currentId] = (counts[currentId] || 0) + 1;
        currentId = parentMap[currentId];
      }
    });
    return counts;
  }, [parentMap, matchedBookmarks]);

  const displayItems = useMemo(() => {
    const query = searchQuery.toLowerCase();
    let items: DisplayItem[] = [];

    // 1. If searching, show flattened results from matchedBookmarks
    if (query) {
      items = matchedBookmarks
        .filter((bk) =>
          bk.title.toLowerCase().includes(query) ||
          (bk.url || "").toLowerCase().includes(query)
        )
        .map((bk) => ({ type: "bookmark", data: bk }));
    }
    // 2. If 'All Bookmarks', show all matched bookmarks flattened
    else if (selectedFolderId === "all") {
      items = matchedBookmarks.map((bk) => ({ type: "bookmark", data: bk }));
    }
    // 3. Explorer view: show direct children of the selected folder
    else {
      const currentFolder = bookmarkMap[selectedFolderId];
      if (currentFolder && currentFolder.children) {
        currentFolder.children.forEach((child) => {
          if (child.url) {
            // Only show if it matches the config (O(1) lookup)
            if (matchedBookmarkIds.has(child.id)) {
              items.push({ type: "bookmark", data: child });
            }
          } else {
            // Only show if it contains matched bookmarks in its subtree
            if (matchedFolderIds.has(child.id)) {
              items.push({ type: "folder", data: child });
            }
          }
        });
      }
    }

    // Apply URL filtering
    items = filterByUrlDomains(items, setting.urlFilters || []);

    // Apply Sorting
    items = sortBookmarks(
      items,
      setting.sortBy || "dateAdded",
      setting.sortOrder || "desc",
      setting.foldersPosition || "top"
    );

    return items;
  }, [
    selectedFolderId,
    matchedBookmarks,
    matchedBookmarkIds,
    searchQuery,
    bookmarkMap,
    matchedFolderIds,
    setting.urlFilters,
    setting.sortBy,
    setting.sortOrder,
    setting.foldersPosition,
  ]);

  return { displayItems, matchedFolderIds, folderCounts };
}
