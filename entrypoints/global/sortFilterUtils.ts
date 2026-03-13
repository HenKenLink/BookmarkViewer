import { BookmarkTreeNode } from "./types";

export function sortBookmarks<T extends BookmarkTreeNode | { type: "bookmark" | "folder"; data: BookmarkTreeNode }>(
  items: T[],
  sortBy: "name" | "dateAdded",
  sortOrder: "asc" | "desc",
  foldersPosition: "top" | "bottom" | "mixed"
): T[] {
  return [...items].sort((a, b) => {
    const nodeA = "data" in a ? (a as any).data : a;
    const nodeB = "data" in b ? (b as any).data : b;

    const isFolderA = !nodeA.url;
    const isFolderB = !nodeB.url;

    if (foldersPosition !== "mixed") {
      if (isFolderA && !isFolderB) return foldersPosition === "top" ? -1 : 1;
      if (!isFolderA && isFolderB) return foldersPosition === "top" ? 1 : -1;
    }

    let compare = 0;
    if (sortBy === "name") {
      const titleA = nodeA.title?.toLowerCase() || "";
      const titleB = nodeB.title?.toLowerCase() || "";
      compare = titleA.localeCompare(titleB);
    } else if (sortBy === "dateAdded") {
      const dateA = nodeA.dateAdded || 0;
      const dateB = nodeB.dateAdded || 0;
      compare = dateA - dateB;
    }

    return sortOrder === "asc" ? compare : -compare;
  });
}

export function filterByUrlDomains<T extends BookmarkTreeNode | { type: "bookmark" | "folder"; data: BookmarkTreeNode }>(
  items: T[],
  urlFilters: string[]
): T[] {
  if (!urlFilters || urlFilters.length === 0) return items;
  
  const lowerFilters = urlFilters.map(f => f.toLowerCase());

  return items.filter((item) => {
    const node = "data" in item ? (item as any).data : item;
    
    // Always keep folders if they are in the list (e.g., in Explorer view)
    if (!node.url) return true;

    const lowerUrl = node.url.toLowerCase();
    try {
      // optimization: check simple string includes before full URL parsing
      if (lowerFilters.some(filter => lowerUrl.includes(filter))) {
        return true;
      }
      return false;
    } catch {
      return false;
    }
  });
}
