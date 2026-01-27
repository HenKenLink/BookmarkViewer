import { BookmarkTreeNode, BookmarkFetchItem, LoadedImageMap } from "../global/types";
import { useStore } from "./store";

type MatchPattern = {
  hostname: string;
  regexPattern?: string;
};

export function filterBookmarkByMatchPattern(
  bookmarkList: BookmarkTreeNode[],
  matchPattern: MatchPattern
): BookmarkTreeNode[] {
  const hostname = matchPattern.hostname;
  const regexPattern = matchPattern.regexPattern;

  const hostMatch = (bkList: BookmarkTreeNode[]) => {
    return bkList.filter((bk) => {
      const url = bk.url;
      if (url) {
        const urlHostname = new URL(url).hostname;
        return urlHostname === hostname;
      } else {
        return false;
      }
    });
  };

  const regMatch = (bkList: BookmarkTreeNode[]) => {
    return bkList.filter((bk) => {
      const url = bk.url;

      if (url) {
        const regex = new RegExp(regexPattern as string);
        return regex.test(url);
      } else {
        return false;
      }
    });
  };

  const matchRes: BookmarkTreeNode[] = hostMatch(bookmarkList);
  if (regexPattern) {
    return regMatch(matchRes);
  }
  return matchRes;
}

// 检查书签的封面加载状态，返回 BookmarkFetchItem 列表
export async function checkBookmarksLoadStatus(
  bookmarkList: BookmarkTreeNode[],
  configId: number
): Promise<{ items: BookmarkFetchItem[]; newLoadedImageMap: LoadedImageMap }> {
  const loadedImageMap = useStore.getState().loadedImageMap;

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
