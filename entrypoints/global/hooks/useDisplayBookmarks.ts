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
  setting: Setting,
  selectedConfigGroupId: string = "all",
  bookmarkToConfigsMap: Record<string, number[]> = {}
) {
  // Memoize filtered bookmarks based on selected group
  const groupMatchedBookmarks = useMemo(() => {
    if (selectedConfigGroupId === "all") return matchedBookmarks;
    
    const group = (setting.configGroups || []).find(g => g.id === selectedConfigGroupId);
    if (!group) return matchedBookmarks;
    
    const groupConfigIds = new Set(group.configIds);
    return matchedBookmarks.filter(bk => {
      const bkConfigIds = bookmarkToConfigsMap[bk.id] || [];
      return bkConfigIds.some(id => groupConfigIds.has(id));
    });
  }, [matchedBookmarks, selectedConfigGroupId, setting.configGroups, bookmarkToConfigsMap]);

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

  // Convert groupMatchedBookmarks to a Set for O(1) lookup
  const matchedBookmarkIds = useMemo(() => {
    return new Set(groupMatchedBookmarks.map(bk => bk.id));
  }, [groupMatchedBookmarks]);

  // Identify folders that contain matched bookmarks in their subtree
  const matchedFolderIds = useMemo(() => {
    const ids = new Set<string>();
    groupMatchedBookmarks.forEach((bk) => {
      let currentId = parentMap[bk.id];
      while (currentId) {
        if (ids.has(currentId)) break; // already traversed
        ids.add(currentId);
        currentId = parentMap[currentId];
      }
    });
    return ids;
  }, [parentMap, groupMatchedBookmarks]);

  const folderCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    groupMatchedBookmarks.forEach((bk) => {
      let currentId = parentMap[bk.id];
      while (currentId) {
        counts[currentId] = (counts[currentId] || 0) + 1;
        currentId = parentMap[currentId];
      }
    });
    return counts;
  }, [parentMap, groupMatchedBookmarks]);

  const displayItems = useMemo(() => {
    const query = searchQuery.toLowerCase();
    let items: DisplayItem[] = [];

    // 1. If searching, show flattened results from groupMatchedBookmarks
    if (query) {
      items = groupMatchedBookmarks
        .filter((bk) =>
          bk.title.toLowerCase().includes(query) ||
          (bk.url || "").toLowerCase().includes(query)
        )
        .map((bk) => ({ type: "bookmark", data: bk }));
    }
    // 2. If 'All Bookmarks', show all matched bookmarks flattened
    else if (selectedFolderId === "all") {
      items = groupMatchedBookmarks.map((bk) => ({ type: "bookmark", data: bk }));
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
    groupMatchedBookmarks,
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
