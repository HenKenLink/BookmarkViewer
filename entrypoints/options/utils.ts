import { BookmarkTreeNode, PageUrl, LoadedImage } from "../global/types";
import { useStore } from "./store";

export function filterBookmarkByHostname(
  bookmarkList: BookmarkTreeNode[],
  hostname: string
): BookmarkTreeNode[] {
  return bookmarkList.filter((bk) => {
    const url = bk.url;
    if (url) {
      const urlHostname = new URL(url).hostname;
      // console.log("urlHostname: ", urlHostname);
      return urlHostname === hostname;
    } else {
      return false;
    }
  });
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
): Promise<PageUrl[]> {
  const loadedImageList = useStore.getState().loadedImageList;
  const updateLoadedImageList = useStore.getState().updateLoadedImageList;

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
          const loadedImage: LoadedImage = { pageUrl: purl, blobUrl: blobUrl };
          newLoadedImageList.push(loadedImage);
          isLoaded = true;
        }
      }
      const pageUrl: PageUrl = { url: purl, isLoaded: isLoaded };
      pageUrlList.push(pageUrl);
    } catch (e) {
      console.error("Error occurred when get stored images for", purl, e);
    }
  }
  updateLoadedImageList(newLoadedImageList);
  return pageUrlList;
}

// export async function filterStoredMatchedUrl(matchedUrlList: MatchedUrl[]): MatchedUrl[]{
//   for (const matchedUrl of matchedUrlList){

//   }
// }
