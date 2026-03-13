import { BookmarkTreeNode, BookmarkFetchItem, LoadedImageMap } from "./types";

type MatchPattern = {
  hostname: string;
  regexPattern?: string;
};

export function filterBookmarkByMatchPattern(
  bookmarkList: BookmarkTreeNode[],
  matchPattern: MatchPattern
): BookmarkTreeNode[] {
  let targetHostname = matchPattern.hostname;
  if (targetHostname.includes("://")) {
    try {
      targetHostname = new URL(targetHostname).hostname;
    } catch (e) {}
  }
  
  const regex = matchPattern.regexPattern ? new RegExp(matchPattern.regexPattern) : null;

  return bookmarkList.filter((bk) => {
    const url = bk.url;
    if (!url) return false;

    try {
      const urlObj = new URL(url);
      if (urlObj.hostname !== targetHostname) return false;
      if (regex && !regex.test(url)) return false;
      return true;
    } catch (e) {
      return false;
    }
  });
}

// 检查书签的封面加载状态，返回 BookmarkFetchItem 列表
export async function checkBookmarksLoadStatus(
  bookmarkList: BookmarkTreeNode[],
  configId: number,
  loadedImageMap: LoadedImageMap
): Promise<{ items: BookmarkFetchItem[]; newLoadedImageMap: LoadedImageMap }> {
  const items: BookmarkFetchItem[] = [];
  const newLoadedImageMap: LoadedImageMap = {};

  // 收集需要从 storage 检查的 URL
  const urlsToFetch = new Set<string>();

  for (const bk of bookmarkList) {
    const purl = bk.url;
    if (purl && !loadedImageMap[bk.id]) {
      urlsToFetch.add(purl);
    }
  }

  // 批量从 storage 获取
  let storageData: Record<string, any> = {};
  if (urlsToFetch.size > 0) {
    try {
      storageData = await browser.storage.local.get(Array.from(urlsToFetch));
    } catch (e) {
      console.error("Error batch fetching from storage:", e);
    }
  }

  // 缓存已创建的 BlobURL 避免重复创建
  const urlToBlobUrl: Record<string, string> = {};

  for (const bk of bookmarkList) {
    const purl = bk.url;
    if (!purl) continue;

    let isLoaded = false;

    // 检查内存中是否已加载
    if (loadedImageMap[bk.id]) {
      isLoaded = true;
    } else {
      // 检查 storage 中是否存在
      const raw = storageData[purl];
      if (raw && raw.length > 0) {
        // 创建或复用 BlobURL
        if (!urlToBlobUrl[purl]) {
          const buf = new Uint8Array(raw);
          const blob = new Blob([buf.buffer], { type: "image/jpeg" });
          urlToBlobUrl[purl] = URL.createObjectURL(blob);
        }

        newLoadedImageMap[bk.id] = urlToBlobUrl[purl];
        isLoaded = true;
      }
    }

    items.push({
      bookmarkId: bk.id,
      pageUrl: purl,
      configId,
      isLoaded,
    });
  }

  return { items, newLoadedImageMap };
}
