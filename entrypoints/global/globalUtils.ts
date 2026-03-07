import { logger } from "./logger";
// import { PageUrl } from "./types";

export function waitForTabLoad(tabId: number, timeoutMs = 30000, signal?: AbortSignal): Promise<void> {
  logger.info(`[Utils] Start waiting for tab ${tabId} to load (timeout: ${timeoutMs}ms)`);
  return new Promise(async (resolve, reject) => {
    let timer: any;

    const cleanup = () => {
      clearTimeout(timer);
      browser.tabs.onUpdated.removeListener(onUpdated);
      browser.tabs.onRemoved.removeListener(onRemoved);
      signal?.removeEventListener("abort", onAbort);
    };

    const onUpdated = (updatedTabId: number, changeInfo: any) => {
      if (updatedTabId === tabId) {
        if (changeInfo.status) {
          logger.info(`[Utils] Tab ${tabId} status updated: ${changeInfo.status}`);
        }
        if (changeInfo.status === "complete") {
          logger.info(`[Utils] Tab ${tabId} load complete`);
          cleanup();
          resolve();
        }
      }
    };

    const onRemoved = (removedTabId: number) => {
      if (removedTabId === tabId) {
        logger.warn(`[Utils] Tab ${tabId} removed while waiting`);
        cleanup();
        reject(new Error(`Tab ${tabId} was closed`));
      }
    };

    const onAbort = () => {
      logger.info(`[Utils] Tab ${tabId} wait aborted`);
      cleanup();
      reject(new Error("Aborted"));
    };

    if (signal?.aborted) {
      logger.info(`[Utils] Tab ${tabId} wait already aborted`);
      reject(new Error("Aborted"));
      return;
    }

    signal?.addEventListener("abort", onAbort);
    browser.tabs.onUpdated.addListener(onUpdated);
    browser.tabs.onRemoved.addListener(onRemoved);

    try {
      const tab = await browser.tabs.get(tabId);
      if (tab.status === 'complete') {
        logger.info(`[Utils] Tab ${tabId} is already complete`);
        cleanup();
        resolve();
        return;
      }
    } catch (e) {
      logger.error(`[Utils] Tab ${tabId} not found initially`, e);
      cleanup();
      reject(new Error(`Tab ${tabId} not found`));
      return;
    }

    timer = setTimeout(() => {
      logger.error(`[Utils] Timeout reached for tab ${tabId}`);
      cleanup();
      reject(new Error(`Timeout waiting for tab ${tabId} to load`));
    }, timeoutMs);
  });
}

