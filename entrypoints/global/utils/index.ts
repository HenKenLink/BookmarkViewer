import { BookmarkTreeNode } from "../types";

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

export function getBookmarksUrl(bookmarkList: BookmarkTreeNode[]): string[] {
  const urlList: string[] = [];
  bookmarkList.forEach((bk) => {
    urlList.push(bk.url as string);
  });
  return urlList;
}

export function waitForTabLoad(tabId: number): Promise<void> {
  return new Promise((resolve) => {
    const listener = (updatedTabId: number, changeInfo: any) => {
      if (updatedTabId === tabId && changeInfo.status === "complete") {
        console.log("Tab loaded.");
        browser.tabs.onUpdated.removeListener(listener);
        resolve();
      }
    };
    browser.tabs.onUpdated.addListener(listener);
  });
}
