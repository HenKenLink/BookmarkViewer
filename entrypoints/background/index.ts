import { logger } from "../global/logger";
import { messageId } from "../global/message";
import { FetchTask, FetchConfig } from "../global/types";

import { waitForTabLoad } from "../global/globalUtils";

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
    let uintBuf: number[];
    if (thumbUrl.startsWith("data:")) {
      // Parse base64 Data URI
      const base64 = thumbUrl.split(",")[1];
      const binaryStr = atob(base64);
      uintBuf = Array.from({ length: binaryStr.length }, (_, i) => binaryStr.charCodeAt(i));
    } else {
      const response = await fetch(thumbUrl);
      const buf = await response.arrayBuffer();
      uintBuf = Array.from(new Uint8Array(buf));
    }
    await browser.storage.local.set({
      [pageUrl]: uintBuf,
    });
  } catch (err) {
    logger.error(`[Background] Failed to download thumb from ${thumbUrl}`, err);
  }
}


// Executor for page mode (runs in page)
async function pageScriptExecutor(selector: string, type: string, attribute: string | null) {
  const getThumb = () => {
    const html = document.documentElement.outerHTML;
    console.debug(`[page] HTML Source:\n`, html.substring(0, 5000) + '...');
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


async function fetchVideoAsDataUrl(videoUrl: string, startByte: number, endByte: number): Promise<string | null> {
  try {
    const res = await fetch(videoUrl, {
      headers: {
        "Range": `bytes=${startByte}-${endByte}`,
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
      }
    });
    
    // Check if the response is successful (200 or 206 Partial Content)
    if (!res.ok) {
       logger.error(`[Background] Failed to fetch video, status: ${res.status}`);
       return null;
    }

    const blob = await res.blob();
    const dataUrl = await new Promise<string>((resolve, reject) => {
       const reader = new FileReader();
       reader.onloadend = () => resolve(reader.result as string);
       reader.onerror = reject;
       reader.readAsDataURL(blob);
    });
    return dataUrl;
  } catch(e) {
    logger.error("[Background] Error fetching partial video", e);
    return null;
  }
}

function videoDataUrlFrameExtractor(dataUrl: string): Promise<string | null> {
  return new Promise<string | null>((resolve) => {
    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    video.autoplay = false;
    
    // Set a timeout to avoid hanging indefinitely
    const timeoutId = setTimeout(() => {
      console.warn("[page] Video frame capture from DataURL timed out");
      cleanup();
      resolve(null);
    }, 15000);

    const cleanup = () => {
      clearTimeout(timeoutId);
      video.onloadeddata = null;
      video.onerror = null;
      video.removeAttribute('src');
      video.load();
    };

    const captureFrame = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 360;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error("Could not get 2d context");
        
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const resultUrl = canvas.toDataURL('image/jpeg', 0.9);
        cleanup();
        resolve(resultUrl);
      } catch (error) {
        console.error("[page] Error taking video snapshot from DataURL", error);
        cleanup();
        resolve(null);
      }
    };

    video.onloadeddata = () => {
      // readyState 2: HAVE_CURRENT_DATA (first frame available)
      if (video.readyState >= 2) {
        captureFrame();
      } else {
        video.addEventListener('canplay', captureFrame, { once: true });
      }
    };

    video.onerror = (e) => {
      console.error("[page] Error loading video for capture from DataURL", video.error);
      cleanup();
      resolve(null);
    };
    
    video.src = dataUrl;
    video.load();
  });
}


// Flag and counters to control fetch and track progress
let isFetchStopped = false;
let currentProgress = 0;
let totalItems = 0;
let abortController: AbortController | null = null;

// Concurrency helper: run tasks with a max concurrency limit
async function runWithConcurrency<T>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<void>,
  shouldStop: () => boolean
): Promise<void> {
  let index = 0;
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (index < items.length && !shouldStop()) {
      const currentIndex = index++;
      await fn(items[currentIndex]);
    }
  });
  await Promise.all(workers);
}

browser.runtime.onMessage.addListener(async (message, sender) => {
  if (message.type === messageId.stopFetch) {
    isFetchStopped = true;
    if (abortController) {
      abortController.abort();
      abortController = null;
    }
    logger.info("[Background] Fetch stop requested");
    return;
  }

  if (message.type === messageId.getThumb) {
    isFetchStopped = false;
    abortController = new AbortController();
    const signal = abortController.signal;
    const fetchTaskList: FetchTask[] = message.fetchTaskList;

    // Get current settings
    const settingsRaw = await browser.storage.local.get(SETTINGS_KEY);
    const settings: Setting = settingsRaw[SETTINGS_KEY] as Setting;
    const {
      enableDelay, fetchDelayCount, fetchDelayTimeMin, fetchDelayTimeMax,
      keepTabsOpen,
      pageModeConcurrency: rawPageConcurrency,
      fastModeConcurrency: rawFastConcurrency,
    } = settings || {};

    const pageModeConcurrency = Math.max(1, Math.min(rawPageConcurrency || 1, 5));
    const fastModeConcurrency = Math.max(1, Math.min(rawFastConcurrency || 3, 10));

    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    // Shared progress counter (atomic-like via single-threaded JS)
    let fastItemsCompletedSinceDelay = 0;

    // Pre-filtering: skip already fetched thumbnails
    const allUrls = fetchTaskList.flatMap(task => task.items.map(item => item.pageUrl));
    const existingThumbs = await browser.storage.local.get(allUrls);

    for (const task of fetchTaskList) {
      task.items = task.items.filter(item => {
        const existing = existingThumbs[item.pageUrl];
        return !existing || (Array.isArray(existing) && existing.length === 0);
      });
    }

    // Calculate total items
    totalItems = 0;
    for (const task of fetchTaskList) {
      totalItems += task.items.length;
    }
    currentProgress = 0;

    if (totalItems === 0) {
      logger.info("[Background] All items already have thumbnails, skipping fetch");
      browser.runtime.sendMessage({ type: messageId.getThumbfinished });
      browser.notifications.create({
        type: "basic",
        iconUrl: "/icon/128.png",
        title: "Bookmark Viewer",
        message: "所有书签封面已存在，无需重复获取。",
      });
      return;
    }

    browser.runtime.sendMessage({
      type: messageId.fetchStarted,
      total: totalItems,
    });

    // ========== PAGE MODE HELPERS ==========

    // Tab pool: create N tabs, reuse them across items
    async function createTabPool(size: number): Promise<number[]> {
      const tabIds: number[] = [];
      for (let i = 0; i < size; i++) {
        const tab = await browser.tabs.create({ url: "about:blank", active: false });
        tabIds.push(tab.id!);
      }
      return tabIds;
    }

    async function cleanupTabPool(tabIds: number[]) {
      if (keepTabsOpen) return;
      for (const tabId of tabIds) {
        try { await browser.tabs.remove(tabId); } catch (_) { /* tab gone */ }
      }
    }

    // Process a single page-mode item using a specific tab
    async function processPageItem(
      tabId: number,
      pageUrl: string,
      config: FetchConfig
    ): Promise<void> {
      const selector = config.selector!;
      const type = config.selectorType || "regex";
      const attribute = config.attribute;

      try {
        await browser.tabs.update(tabId, { url: pageUrl });
        await waitForTabLoad(tabId, 30000, signal);

        const res = await browser.scripting.executeScript({
          target: { tabId },
          func: pageScriptExecutor,
          args: [selector, type, attribute ?? null],
          world: "MAIN",
        });

        const targetUrl = res?.[0]?.result;
        let finalThumbUrl: string | null | undefined = null;

        if (targetUrl) {
          if (config.resultType === "video_url") {
            const chunkSizeMB = settings.videoFetchChunkSize || 1.5;
            const maxRetries = settings.videoFetchMaxRetries || 3;
            const chunkSizeBytes = Math.floor(chunkSizeMB * 1024 * 1024);

            for (let i = 0; i <= maxRetries; i++) {
              const currentEndByte = (i + 1) * chunkSizeBytes;
              logger.info(`[Background] Attempt ${i + 1} to fetch video frame for ${pageUrl} (Range: 0-${currentEndByte})`);
              const videoDataUrl = await fetchVideoAsDataUrl(targetUrl, 0, currentEndByte);
              
              if (videoDataUrl) {
                logger.info(`[Background] Video buffered to memory -> starting ISOLATED frame extraction...`);
                const frameRes = await browser.scripting.executeScript({
                  target: { tabId },
                  func: videoDataUrlFrameExtractor,
                  args: [videoDataUrl],
                  world: "ISOLATED",
                });
                finalThumbUrl = frameRes?.[0]?.result;
                if (finalThumbUrl) {
                  logger.info(`[Background] Successfully extracted frame on attempt ${i + 1}`);
                  break;
                }
              }
              
              if (i < maxRetries) {
                logger.warn(`[Background] Frame extraction failed on attempt ${i + 1}, retrying with larger range...`);
              } else {
                logger.error(`[Background] Frame extraction failed after all ${maxRetries + 1} attempts`);
              }
            }
          } else {
            finalThumbUrl = targetUrl;
          }
        }

        if (finalThumbUrl) {
          await saveThumb({ pageUrl, thumbUrl: finalThumbUrl });
        } else {
          logger.warn(`[Background] No thumb found for ${pageUrl} in page mode`);
        }
      } catch (err) {
        logger.error(`[Background] Failed to process ${pageUrl} in page mode`, err);
      } finally {
        currentProgress++;
        try {
          browser.runtime.sendMessage({
            type: messageId.singleThumbFinished,
            pageUrl,
            progress: currentProgress,
            total: totalItems,
          });
        } catch (_) { /* listener gone */ }
      }
    }

    // ========== FAST MODE HELPERS ==========

    // Fetch a single fast-mode item and apply delay logic
    async function fetchSingleFastItem(
      pageUrl: string,
      selector: string,
      type: SelectorType,
      attribute?: string
    ): Promise<void> {
      let thumbUrl: string | null | undefined = null;

      try {
        logger.info(`[Background] Fetching fast thumb from ${pageUrl} using ${type}`);
        const response = await fetch(pageUrl, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
          },
        });
        const html = await response.text();
        logger.debug(`[fast] HTML Source for ${pageUrl}:\n`, html.substring(0, 5000) + '...');

        if (type === "regex") {
          const regex = new RegExp(selector);
          const match = html.match(regex);
          if (match && match[1]) {
            thumbUrl = match[1];
          }
        } else {
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
              selector, doc, null,
              XPathResult.FIRST_ORDERED_NODE_TYPE, null
            );
            const node = result.singleNodeValue;
            if (node) {
              if (node.nodeType === Node.ATTRIBUTE_NODE) {
                thumbUrl = node.nodeValue;
              } else if (node.nodeType === Node.ELEMENT_NODE) {
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
          thumbUrl = new URL(thumbUrl, pageUrl).toString();
          await saveThumb({ pageUrl, thumbUrl });
        } else {
          logger.warn(`[Background] No suitable match found for selector on ${pageUrl}`);
        }
      } catch (err) {
        logger.error(`[Background] Failed to fetch ${pageUrl} in fast mode`, err);
      } finally {
        currentProgress++;
        fastItemsCompletedSinceDelay++;

        try {
          browser.runtime.sendMessage({
            type: messageId.singleThumbFinished,
            pageUrl,
            progress: currentProgress,
            total: totalItems,
          });
        } catch (_) { /* listener gone */ }

        // Delay control (fast mode only)
        if (enableDelay && fetchDelayCount > 0 && fastItemsCompletedSinceDelay >= fetchDelayCount && currentProgress < totalItems) {
          fastItemsCompletedSinceDelay = 0;
          const min = fetchDelayTimeMin || 1000;
          const max = fetchDelayTimeMax || 3000;
          const randomDelay = Math.floor(Math.random() * (max - min + 1)) + min;
          logger.info(`[Background] Fast mode delay: ${randomDelay}ms after ${fetchDelayCount} items`);
          await delay(randomDelay);
        }
      }
    }

    // ========== MAIN LOOP ==========

    for (const task of fetchTaskList) {
      if (isFetchStopped) break;

      const config = task.config;
      const pageUrlList = task.items.map(item => item.pageUrl);
      const selector = config.selector;
      const mode = config.mode;

      logger.info(`[Background] Getting thumbnails for: ${config.hostname} (${mode} mode, ${pageUrlList.length} items)`);

      if (mode === "page" && selector) {
        // Page mode: concurrent tab pool with reuse
        const poolSize = Math.min(pageModeConcurrency, pageUrlList.length);
        logger.info(`[Background] Page mode: using ${poolSize} concurrent tab(s)`);

        const tabPool = await createTabPool(poolSize);
        const availableTabs = [...tabPool];

        // Use concurrency runner with tab assignment
        await runWithConcurrency(
          pageUrlList,
          poolSize,
          async (pageUrl) => {
            const tabId = availableTabs.pop()!;
            try {
              await processPageItem(tabId, pageUrl, config);
            } finally {
              availableTabs.push(tabId);
            }
          },
          () => isFetchStopped
        );

        await cleanupTabPool(tabPool);

      } else if (mode === "fast" && selector) {
        // Fast mode: concurrent HTTP fetches
        const type = config.selectorType || "regex";
        const attribute = config.attribute;
        logger.info(`[Background] Fast mode: using ${fastModeConcurrency} concurrent request(s)`);

        fastItemsCompletedSinceDelay = 0;

        await runWithConcurrency(
          pageUrlList,
          fastModeConcurrency,
          async (pageUrl) => {
            await fetchSingleFastItem(pageUrl, selector, type, attribute);
          },
          () => isFetchStopped
        );
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
    logger.info(`[Background] Initializing. DEV: ${__DEV__}, CHROME: ${__CHROME__}`);

    if (__DEV__) {
      logger.info("[Background] Running in DEV mode, adding test data...");
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
