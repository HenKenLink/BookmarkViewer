import { PageUrl } from "./types";

export function waitForTabLoad(tabId: number, timeoutMs = 30000): Promise<void> {
  return new Promise(async (resolve, reject) => {
    try {
      const tab = await browser.tabs.get(tabId);
      if (tab.status === 'complete') {
        resolve();
        return;
      }
    } catch (e) {
      reject(new Error(`Tab ${tabId} not found`));
      return;
    }

    const timer = setTimeout(() => {
      cleanup();
      reject(new Error(`Timeout waiting for tab ${tabId} to load`));
    }, timeoutMs);

    const onUpdated = (updatedTabId: number, changeInfo: any) => {
      if (updatedTabId === tabId && changeInfo.status === "complete") {
        cleanup();
        resolve();
      }
    };

    const onRemoved = (removedTabId: number) => {
      if (removedTabId === tabId) {
        cleanup();
        reject(new Error(`Tab ${tabId} was closed`));
      }
    };

    const cleanup = () => {
      clearTimeout(timer);
      browser.tabs.onUpdated.removeListener(onUpdated);
      browser.tabs.onRemoved.removeListener(onRemoved);
    };

    browser.tabs.onUpdated.addListener(onUpdated);
    browser.tabs.onRemoved.addListener(onRemoved);
  });
}

