import { messageId } from "../global/message";
import { FetchTask, FetchConfig } from "../global/types";

import { waitForTabLoad, filterUnloadPageUrl } from "../global/globalUtils";
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
        thumbList.push({ pageUrl, thumbUrl });
      } else {
        console.warn(`[Background] No suitable match found for selector on ${pageUrl}`);
      }
    } catch (err) {
      console.error(
        `[Background] Failed to fetch ${pageUrl} in simple mode`,
        err
      );
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

browser.runtime.onMessage.addListener(async (message, sender) => {
  if (message.type === messageId.stopFetch) {
    isFetchStopped = true;
    console.log("[Background] Fetch stop requested");
    return;
  }

  if (message.type === messageId.getThumb) {
    isFetchStopped = false;
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
        const hostname = config.hostname;
        const tabUrl = `https://${hostname}`;
        const tab = await browser.tabs.create({
          url: tabUrl,
          active: false,
        });
        const tabId = tab.id!;
        await waitForTabLoad(tabId);
        console.log(`[Background] Using unified serial injection with MAIN world for ${hostname}`);
        for (const pageUrl of pageUrlList) {
          if (isFetchStopped) break;
          try {
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
            }
          } catch (err) {
            console.error(`[Background] Script execution failed for ${pageUrl}`, err);
          }
        }
        await browser.tabs.remove(tabId);
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

        await saveThumb(thumb);
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
      }
    }

    if (isFetchStopped) {
      browser.runtime.sendMessage({ type: messageId.fetchStopped });
    } else {
      browser.runtime.sendMessage({ type: messageId.getThumbfinished });
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
