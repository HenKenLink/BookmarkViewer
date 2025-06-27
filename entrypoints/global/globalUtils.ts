import { PageUrl } from "./types";

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

export function filterUnloadPageUrl(pageUrlList: PageUrl[]): string[] {
  const unloadPageUrl: string[] = [];
  pageUrlList.forEach((pageUrl) => {
    if (pageUrl.isLoaded === false) {
      unloadPageUrl.push(pageUrl.url);
    }
  });
  return unloadPageUrl;
}
