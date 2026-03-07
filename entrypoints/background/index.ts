import { messageId } from "../global/message";
import { FetchTask, FetchConfig } from "../global/types";

import { waitForTabLoad } from "../global/globalUtils";
import { useStore } from "../options/store";
import { SelectorType, Setting } from "../global/types";
import { SETTINGS_KEY } from "../options/consts";

type Thumb = {
  pageUrl: string;
  thumbUrl: string;
};

const openUI = async () => {
  // @ts-ignore
  const url = browser.runtime.getURL("options.html");
  const tabs = (await browser.tabs.query({}))
    .map((tab) => {
      tab.url = tab.url!.split("#")[0];
      return tab;
    })
    .filter((tab) => tab.url === url);
  if (tabs.length) {
    browser.tabs.update(tabs[0].id!, { active: true });
  } else {
    browser.tabs.create({ url });
  }
};

async function saveThumb(thumb: Thumb): Promise<void> {
  const thumbUrl = thumb.thumbUrl;
  const pageUrl = thumb.pageUrl;
  try {
    const response = await fetch(thumbUrl);
    const buf = await response.arrayBuffer();
    const uintBuf = Array.from(new Uint8Array(buf));
    await browser.storage.local.set({
      [pageUrl]: uintBuf,
    });
  } catch (err) {
    console.error(`[Background] Failed to download thumb from ${thumbUrl}`, err);
  }
}


// Executor for open_simple mode (runs in page)
async function simpleScriptExecutor(selector: string, type: string, attribute: string | null) {
  const getThumb = () => {
    const html = document.documentElement.outerHTML;
    let thumbUrl: string | null | undefined = null;

    if (type === "regex") {
      const regex = new RegExp(selector);
      const match = html.match(regex);
      if (match && match[1]) {
        thumbUrl = match[1];
      }
    } else {
      // Use document for CSS and XPath
      if (type === "css") {
        const element = document.querySelector(selector);
        if (element) {
          thumbUrl = attribute
            ? element.getAttribute(attribute)
            : element.getAttribute("src") ||
            element.getAttribute("content") ||
            element.textContent;
        }
      } else if (type === "xpath") {
        const result = document.evaluate(
          selector,
          document,
          null,
          XPathResult.FIRST_ORDERED_NODE_TYPE,
          null
        );
        const node = result.singleNodeValue;
        if (node) {
          if (node.nodeType === Node.ATTRIBUTE_NODE) {
            thumbUrl = node.nodeValue;
          } else if (node.nodeType === Node.ELEMENT_NODE) {
            // Try to guess reasonable attributes if just element is selected
            const el = node as Element;
            thumbUrl =
              el.getAttribute("src") ||
              el.getAttribute("content") ||
              el.getAttribute("href") ||
              el.textContent;
          } else {
            thumbUrl = node.textContent;
          }
        }
      }
    }

    if (thumbUrl) {
      try {
        return new URL(thumbUrl, document.baseURI).href;
      } catch (e) {
        return thumbUrl;
      }
    }
    return null;
  };

  // // Poll for up to 10 seconds
  // const startTime = Date.now();
  // while (Date.now() - startTime < 10000) {
  //   const thumbUrl = getThumb();
  //   if (thumbUrl) return thumbUrl;
  //   // Wait 500ms
  //   await new Promise(resolve => setTimeout(resolve, 500));
  // }

  const thumbUrl = getThumb();
  if (thumbUrl) return thumbUrl;

  return null;
}

async function fetchSimpleThumb(
  pageUrlList: string[],
  selector: string,
  type: SelectorType,
  attribute?: string
): Promise<Thumb[]> {
  const thumbList: Thumb[] = [];
  for (const pageUrl of pageUrlList) {
    try {
      console.log(`[Background] Fetching simple thumb from ${pageUrl} using ${type}`);
      const response = await fetch(pageUrl, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        },
      });
      const html = await response.text();
      let thumbUrl: string | null | undefined = null;

      if (type === "regex") {
        const regex = new RegExp(selector);
        const match = html.match(regex);
        if (match && match[1]) {
          thumbUrl = match[1];
        }
      } else {
        // Parse DOM for CSS and XPath
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, "text/html");

        if (type === "css") {
          const element = doc.querySelector(selector);
          if (element) {
            thumbUrl = attribute
              ? element.getAttribute(attribute)
              : element.getAttribute("src") ||
              element.getAttribute("content") ||
              element.textContent;
          }
        } else if (type === "xpath") {
          const result = doc.evaluate(
            selector,
            doc,
            null,
            XPathResult.FIRST_ORDERED_NODE_TYPE,
            null
          );
          const node = result.singleNodeValue;
          if (node) {
            if (node.nodeType === Node.ATTRIBUTE_NODE) {
              thumbUrl = node.nodeValue;
            } else if (node.nodeType === Node.ELEMENT_NODE) {
              // Try to guess reasonable attributes if just element is selected
              const el = node as Element;
              thumbUrl =
                el.getAttribute("src") ||
                el.getAttribute("content") ||
                el.getAttribute("href") ||
                el.textContent;
            } else {
              thumbUrl = node.textContent;
            }
          }
        }
      }

      if (thumbUrl) {
        // Resolve relative URLs
        thumbUrl = new URL(thumbUrl, pageUrl).toString();
      } else {
        console.warn(`[Background] No suitable match found for selector on ${pageUrl}`);
      }
      thumbList.push({ pageUrl, thumbUrl: thumbUrl || "" });
    } catch (err) {
      console.error(
        `[Background] Failed to fetch ${pageUrl} in simple mode`,
        err
      );
      thumbList.push({ pageUrl, thumbUrl: "" });
    }
  }
  return thumbList;
}

function dynamicExecutor(script: string, pageUrlList: string[]): Function {
  try {
    const func = new Function(
      "pageUrlList",
      `return (async () => {
      ${script}
    })();`
    );
    // @ts-ignore
    return func(pageUrlList);
  } catch (e) {
    console.error("Error executing dynamic script:", e);
    throw e;
  }
}

// Flag and counters to control fetch and track progress
let isFetchStopped = false;
let currentProgress = 0;
let totalItems = 0;
let abortController: AbortController | null = null;


browser.runtime.onMessage.addListener(async (message, sender) => {
  if (message.type === messageId.stopFetch) {
    isFetchStopped = true;
    if (abortController) {
      abortController.abort();
      abortController = null;
    }
    console.log("[Background] Fetch stop requested");
    return;
  }


  if (message.type === messageId.getThumb) {
    isFetchStopped = false;
    abortController = new AbortController();
    const signal = abortController.signal;
    const fetchTaskList: FetchTask[] = message.fetchTaskList;


    // Get current settings for delay
    const settingsRaw = await browser.storage.local.get(SETTINGS_KEY);
    const settings: Setting = settingsRaw[SETTINGS_KEY] as Setting;
    const { enableDelay, fetchDelayCount, fetchDelayTimeMin, fetchDelayTimeMax } = settings || {};

    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
    let itemsFetchedInSession = 0;

    // Calculate total items
    totalItems = 0;
    for (const task of fetchTaskList) {
      totalItems += task.items.length;
    }

    // Reset progress
    currentProgress = 0;

    // Send fetch started message
    browser.runtime.sendMessage({
      type: messageId.fetchStarted,
      total: totalItems,
    });

    // Helper to ensure we have a valid tab
    async function getOrCreateTab(tabId: number | null, initialUrl: string): Promise<number> {
      if (tabId !== null) {
        try {
          const tab = await browser.tabs.get(tabId);
          if (tab.id) return tab.id;
        } catch (e) {
          console.log(`[Background] Tab ${tabId} lost, will create new one`);
        }
      }
      const tab = await browser.tabs.create({ url: initialUrl, active: false });
      return tab.id!;
    }

    for (const task of fetchTaskList) {
      if (isFetchStopped) break;

      const config = task.config;
      const pageUrlList = task.items.map(item => item.pageUrl);

      console.log(`[Background] Getting thumbnails for: ${config.hostname}`);

      const script = config.fetchScript;
      const mode = config.mode || "inject";
      const selector = config.selector;

      let thumbList: Thumb[] = [];

      if (mode === "inject" && script) {
        let hostname = config.hostname;
        // Normalize hostname: remove protocol if user incorrectly entered it
        if (hostname.includes("://")) {
          try {
            hostname = new URL(hostname).hostname;
          } catch (e) { }
        }
        const tabUrl = `https://${hostname}`;
        let tabId: number | null = null;

        console.log(`[Background] Using unified serial injection with MAIN world for ${hostname}`);

        try {
          // Initialize tab for this batch
          tabId = await getOrCreateTab(null, tabUrl);
          await waitForTabLoad(tabId, 30000, signal);


          for (const pageUrl of pageUrlList) {
            if (isFetchStopped) break;
            try {
              // Ensure tab is still valid before processing each item
              tabId = await getOrCreateTab(tabId, tabUrl);
              // If we had to recreate the tab, we might need to wait for load, 
              // but getOrCreateTab with tabUrl starts loading.
              // For inject mode, we generally want to stay on the main domain page 
              // or just have a tab open to the domain.
              // However, the original logic created the tab once. 
              // If recreated, we should wait for load.
              // We can check if tab status is complete via waitForTabLoad.
              await waitForTabLoad(tabId, 30000, signal);

              console.log(`[Background] Injecting script for ${pageUrl}`);

              const res = await browser.scripting.executeScript({
                target: { tabId },
                func: dynamicExecutor,
                args: [script, [pageUrl]],
                world: "MAIN",
              });

              const executionResult = res?.[0]?.result;
              const results = (executionResult as any)?.results || [];

              console.log(`[Background] Got results for ${pageUrl}:`, results);

              for (const thumb of results) {
                await saveThumb(thumb);
              }
            } catch (err) {
              console.error(`[Background] Script execution failed for ${pageUrl}`, err);
            } finally {
              try {
                currentProgress++;
                itemsFetchedInSession++;

                browser.runtime.sendMessage({
                  type: messageId.singleThumbFinished,
                  pageUrl: pageUrl,
                  progress: currentProgress,
                  total: totalItems,
                });

                // Check for delay
                if (enableDelay && fetchDelayCount > 0 && itemsFetchedInSession % fetchDelayCount === 0 && currentProgress < totalItems) {
                  const randomDelay = Math.floor(Math.random() * (fetchDelayTimeMax - fetchDelayTimeMin + 1)) + fetchDelayTimeMin;
                  console.log(`[Background] Delaying for ${randomDelay}ms after fetching ${itemsFetchedInSession} items`);
                  await delay(randomDelay);
                }
              } catch (e) {
                console.error(`[Background] Error in finally block for ${pageUrl} (inject)`, e);
              }
            }
          }
        } finally {
          if (tabId) {
            try { await browser.tabs.remove(tabId); } catch (e) { }
          }
        }
        continue;
      } else if (mode === "open_simple" && selector) {
        let tabId: number | null = null;
        const type = config.selectorType || "regex";
        const attribute = config.attribute;

        try {
          // Iterate over all pages
          for (const pageUrl of pageUrlList) {
            if (isFetchStopped) break;

            try {
              // Get or create tab (using about:blank as default if creating new)
              tabId = await getOrCreateTab(tabId, "about:blank");

              await browser.tabs.update(tabId, { url: pageUrl });
              await waitForTabLoad(tabId, 30000, signal);

              const res = await browser.scripting.executeScript({

                target: { tabId },
                func: simpleScriptExecutor,
                args: [selector, type, attribute ?? null],
                world: "MAIN",
              });

              const thumbUrl = res?.[0]?.result;
              if (thumbUrl) {
                const thumb = { pageUrl, thumbUrl };
                await saveThumb(thumb);
              } else {
                console.warn(`[Background] No thumb found for ${pageUrl} in open_simple mode`);
              }

            } catch (err) {
              console.error(`[Background] Failed to process ${pageUrl} in open_simple mode`, err);
              // If error allows, we might want to reset tabId if we suspect tab is dead,
              // but the next iteration check will handle 'tab not found' errors.
              // If 'waitForTabLoad' throws 'Tab ... was closed', we proceed to next item,
              // and next loop checks find tabId invalid and recreate it.

            } finally {
              try {
                currentProgress++;
                itemsFetchedInSession++;

                browser.runtime.sendMessage({
                  type: messageId.singleThumbFinished,
                  pageUrl: pageUrl,
                  progress: currentProgress,
                  total: totalItems,
                });

                // Check for delay
                if (enableDelay && fetchDelayCount > 0 && itemsFetchedInSession % fetchDelayCount === 0 && currentProgress < totalItems) {
                  const randomDelay = Math.floor(Math.random() * (fetchDelayTimeMax - fetchDelayTimeMin + 1)) + fetchDelayTimeMin;
                  console.log(`[Background] Delaying for ${randomDelay}ms after fetching ${itemsFetchedInSession} items`);
                  await delay(randomDelay);
                }
              } catch (e) {
                console.error(`[Background] Error in finally block for ${pageUrl} (open_simple)`, e);
              }
            }
          }
        } finally {
          if (tabId !== null) {
            try {
              await browser.tabs.remove(tabId);
            } catch (e) {
              // Ignore removal errors (tab might be already gone)
            }
          }
        }
        continue;
      } else if (mode === "simple" && selector) {
        thumbList = await fetchSimpleThumb(
          pageUrlList,
          selector,
          config.selectorType || "regex",
          config.attribute
        );
      }

      for (const thumb of thumbList) {
        if (isFetchStopped) break;

        try {
          if (thumb.thumbUrl) {
            await saveThumb(thumb);
          }

          currentProgress++;
          itemsFetchedInSession++;

          browser.runtime.sendMessage({
            type: messageId.singleThumbFinished,
            pageUrl: thumb.pageUrl,
            progress: currentProgress,
            total: totalItems,
          });

          // Check for delay
          if (enableDelay && fetchDelayCount > 0 && itemsFetchedInSession % fetchDelayCount === 0 && currentProgress < totalItems) {
            const randomDelay = Math.floor(Math.random() * (fetchDelayTimeMax - fetchDelayTimeMin + 1)) + fetchDelayTimeMin;
            console.log(`[Background] Delaying for ${randomDelay}ms after fetching ${itemsFetchedInSession} items`);
            await delay(randomDelay);
          }
        } catch (e) {
          console.error(`[Background] Error in simple mode loop for ${thumb.pageUrl}`, e);
        }
      }
    }

    if (isFetchStopped) {
      browser.runtime.sendMessage({ type: messageId.fetchStopped });
      browser.notifications.create({
        type: "basic",
        iconUrl: "/icon/128.png",
        title: "Bookmark Viewer",
        message: "获取任务已停止",
      });
    } else {
      browser.runtime.sendMessage({ type: messageId.getThumbfinished });
      browser.notifications.create({
        type: "basic",
        iconUrl: "/icon/128.png",
        title: "Bookmark Viewer",
        message: `获取完成！共获取了 ${totalItems} 个书签封面。`,
      });
    }
  }
});

export default defineBackground(() => {
  (async () => {
    console.log(`[Background] Initializing. DEV: ${__DEV__}, CHROME: ${__CHROME__}`);

    if (__DEV__) {
      console.log("[Background] Running in DEV mode, adding test data...");
      const { testStorageConfig, testAddBookmarks } = await import("../global/test");
      await testStorageConfig();
      await testAddBookmarks();
      openUI();
    }
  })();

  if (__CHROME__) {
    browser.action.onClicked.addListener(openUI);
  } else {
    browser.browserAction.onClicked.addListener(openUI);
  }

  // browser.runtime.onMessage.addListener(async (message, sender) => {
  //   if (message.type === messageId.thumbUrl) {
  //     await saveThumb(message);
  //   }
  // });
});
