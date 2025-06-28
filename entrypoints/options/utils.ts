import { BookmarkTreeNode, PageUrl, LoadedImage } from "../global/types";
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
        // console.log("urlHostname: ", urlHostname);
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
export async function loadPageUrlFromBookmarks(
  bookmarkList: BookmarkTreeNode[]
): Promise<{ pageUrlList: PageUrl[]; unStoredPageUrlList: string[] }> {
  const loadedImageList = useStore.getState().loadedImageList;
  const updateLoadedImageList = useStore.getState().updateLoadedImageList;

  const unStoredUrlList: string[] = [];
  const newLoadedImageList: LoadedImage[] = [];
  const pageUrlList: PageUrl[] = [];
  for (const bk of bookmarkList) {
    const purl: string = bk.url as string;
    try {
      let isLoaded = loadedImageList.some((item) => item.pageUrl === purl);
      if (!isLoaded) {
        const res = await browser.storage.local.get(purl);
        const raw = res[purl];
        if (res && raw && raw.length > 0) {
          const buf = new Uint8Array(raw);
          const blob = new Blob([buf.buffer], { type: "image/jpeg" });
          const blobUrl = URL.createObjectURL(blob);
          const loadedImage: LoadedImage = {
            bookmarkId: bk.id,
            pageUrl: purl,
            blobUrl: blobUrl,
          };
          newLoadedImageList.push(loadedImage);
          isLoaded = true;
        } else {
          unStoredUrlList.push(purl);
        }
      }
      const pageUrl: PageUrl = { url: purl, isLoaded: isLoaded };
      console.log("pageUrl in loadPageUrlFromBookmarks: ", pageUrl);
      pageUrlList.push(pageUrl);
    } catch (e) {
      console.error("Error occurred when get stored images for", purl, e);
    }
  }
  updateLoadedImageList(newLoadedImageList);
  console.log("pageUrlList in loadPageUrlFromBookmarks: ", pageUrlList);
  return { pageUrlList: pageUrlList, unStoredPageUrlList: unStoredUrlList };
}

// export async function filterStoredMatchedUrl(matchedUrlList: MatchedUrl[]): MatchedUrl[]{
//   for (const matchedUrl of matchedUrlList){

//   }
// }
