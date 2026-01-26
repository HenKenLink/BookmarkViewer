import { BookmarkTreeNode, PageUrl, LoadedImage, LoadedImageMap } from "../global/types";
import { useStore } from "./store";

// export function filterBookmarkByHostname(
//   bookmarkList: BookmarkTreeNode[],
//   matchPattern: MatchPattern
// ): BookmarkTreeNode[] {
//   if (matchPattern.hostname && matchPattern.regexPattern) {
//     const hostname = matchPattern.hostname;
//     const hostFilterRes = bookmarkList.filter((bk) => {
//       const url = bk.url;
//       if (url) {
//         const urlHostname = new URL(url).hostname;
//         // console.log("urlHostname: ", urlHostname);
//         return urlHostname === hostname;
//       } else {
//         return false;
//       }
//     });
//     const regFilterRes = hostFilterRes.filter((bk) => {
//       const url = bk.url;
//       const regexPattern = matchPattern.regexPattern as string;
//       if (url) {
//         const regex = new RegExp(regexPattern);
//         // console.log("urlHostname: ", urlHostname);
//         return regex.test(url);
//       } else {
//         return false;
//       }
//     });
//     return regFilterRes
//   }
// }

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
        // console.log("Bookmark host: ", urlHostname);
        // TODO: Hostname fuzzy match.
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
        // console.log("urlHostname: ", urlHostname);
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

// export async function getBookmarksUrl(bookmarkList: BookmarkTreeNode[]): string[] {
//   const urlList: string[] = [];
//   bookmarkList.forEach((bk) => {
//     urlList.push(bk.url as string);
//   });
//   return urlList;
// }

// Get pageUrl from bookmark and load image from local storage
// Get pageUrl from bookmark and load image from local storage
export async function loadPageUrlFromBookmarks(
  bookmarkList: BookmarkTreeNode[]
): Promise<{ pageUrlList: PageUrl[]; unStoredPageUrlList: string[] }> {
  const loadedImageMap = useStore.getState().loadedImageMap;
  const updateLoadedImageMap = useStore.getState().updateLoadedImageMap;

  const unStoredUrlList: string[] = [];
  const newLoadedImageMap: LoadedImageMap = {};
  const pageUrlList: PageUrl[] = [];

  // 1. Identify URLs that need checking (avoid fetching if we already have a blobUrl for this bookmark? 
  // actually we need to check if the blobUrl is still valid? No, assumption is if in store, it's valid)
  // But strictly, if we already have loadedImageMap[bk.id], we don't need to look at storage.

  const urlsToFetch = new Set<string>();

  for (const bk of bookmarkList) {
    const purl = bk.url;
    if (purl && !loadedImageMap[bk.id]) {
      urlsToFetch.add(purl);
    }
  }

  // 2. Batch fetch from storage
  let storageData: Record<string, any> = {};
  if (urlsToFetch.size > 0) {
    try {
      storageData = await browser.storage.local.get(Array.from(urlsToFetch));
    } catch (e) {
      console.error("Error batch fetching from storage:", e);
    }
  }

  // 3. Process bookmarks
  // Cache created BlobURLs to avoid creating duplicates for same URL
  const urlToBlobUrlRaw: Record<string, string> = {};

  for (const bk of bookmarkList) {
    const purl = bk.url;
    if (!purl) continue;

    let isLoaded = false;

    // Check if already in memory
    if (loadedImageMap[bk.id]) {
      isLoaded = true;
    } else {
      // Check storage result
      const raw = storageData[purl];
      if (raw && raw.length > 0) {
        // Create or reuse BlobURL
        if (!urlToBlobUrlRaw[purl]) {
          const buf = new Uint8Array(raw);
          const blob = new Blob([buf.buffer], { type: "image/jpeg" });
          urlToBlobUrlRaw[purl] = URL.createObjectURL(blob);
        }

        newLoadedImageMap[bk.id] = urlToBlobUrlRaw[purl];
        isLoaded = true;
      } else {
        // Not in memory, not in storage
        unStoredUrlList.push(purl);
      }
    }

    pageUrlList.push({ url: purl, isLoaded });
  }

  // 4. Update store
  if (Object.keys(newLoadedImageMap).length > 0) {
    updateLoadedImageMap(newLoadedImageMap);
  }

  return { pageUrlList, unStoredPageUrlList: unStoredUrlList };
}

// export async function filterStoredMatchedUrl(matchedUrlList: MatchedUrl[]): MatchedUrl[]{
//   for (const matchedUrl of matchedUrlList){

//   }
// }
