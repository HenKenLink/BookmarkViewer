import { logger } from "../global/logger";
import { messageId } from "../global/message";
import { FetchTask, FetchConfig } from "../global/types";

import { waitForTabLoad } from "../global/globalUtils";

import { SelectorType, Setting } from "../global/types";
import { SETTINGS_KEY } from "../global/consts";

type Thumb = {
  pageUrl: string;
  thumbUrl: string;
};

const openUI = async () => {
  // @ts-ignore
  const url = browser.runtime.getURL("/viewer.html");
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

async function saveThumb(thumb: Thumb): Promise<boolean> {
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
    return true;
  } catch (err) {
    logger.error(`[Background] Failed to download thumb from ${thumbUrl}`, err);
    return false;
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

  // Poll for up to 10 seconds
  const startTime = Date.now();
  const timeout = 10000;

  while (Date.now() - startTime < timeout) {
    const thumbUrl = getThumb();
    if (thumbUrl) return thumbUrl;

    // Wait 500ms
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // Final attempt
  return getThumb();
}


async function fetchVideoChunk(videoUrl: string, startByte: number, endByte: number): Promise<Blob | null> {
  try {
    const res = await fetch(videoUrl, {
      headers: {
        "Range": `bytes=${startByte}-${endByte}`,
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
      }
    });

    // Check if the response is successful (200 or 206 Partial Content)
    if (!res.ok) {
      logger.error(`[Background] Failed to fetch video chunk, status: ${res.status}`);
      return null;
    }

    return await res.blob();
  } catch (e) {
    logger.error("[Background] Error fetching video chunk", e);
    return null;
  }
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// 探测 MP4 文件的元数据结束位置
async function detectMp4MetadataEnd(videoUrl: string): Promise<number | null> {
  try {
    // 先取前 128KB 探测结构
    const res = await fetch(videoUrl, {
      headers: {
        "Range": "bytes=0-131071",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
      }
    });
    if (!res.ok) return null;
    const buffer = await res.arrayBuffer();
    const view = new DataView(buffer);

    let offset = 0;
    while (offset < view.byteLength - 8) {
      const size = view.getUint32(offset);
      const type = String.fromCharCode(
        view.getUint8(offset + 4),
        view.getUint8(offset + 5),
        view.getUint8(offset + 6),
        view.getUint8(offset + 7)
      );

      // 如果找到了 moov，说明元数据到此结束
      if (type === 'moov') {
        logger.info(`[Background] Detected 'moov' atom at offset ${offset}, size ${size}. Total metadata: ${offset + size} bytes.`);
        return offset + size;
      }

      if (size <= 0 || size > 100 * 1024 * 1024) break; // 防止死循环或异常大小
      offset += size;
    }
  } catch (e) {
    logger.warn("[Background] Failed to detect MP4 metadata size", e);
  }
  return null;
}

async function videoDataUrlFrameExtractor(dataUrl: string): Promise<string | null> {
  return new Promise<string | null>((resolve) => {
    // Some browsers may throttle video decoding in background or if not in DOM
    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    video.autoplay = false;

    // Style to ensure it's "visible" but not intrusive
    video.style.position = 'fixed';
    video.style.top = '0';
    video.style.left = '0';
    video.style.width = '1px';
    video.style.height = '1px';
    video.style.opacity = '0.01';
    video.style.pointerEvents = 'none';
    video.style.zIndex = '-9999';

    // Set a timeout to avoid hanging indefinitely
    const timeoutId = setTimeout(() => {
      console.warn("[page] Video frame capture from DataURL timed out after 15s");
      cleanup();
      resolve(null);
    }, 15000);

    const cleanup = () => {
      clearTimeout(timeoutId);
      video.onloadeddata = null;
      video.onerror = null;
      video.oncanplay = null;
      try {
        video.pause();
        video.removeAttribute('src');
        video.load();
        video.remove();
      } catch (e) {
        console.error("[page] Error during cleanup", e);
      }
    };

    const captureFrame = () => {
      console.log("[page] Video ready for capture, readyState:", video.readyState);
      try {
        const canvas = document.createElement('canvas');
        // Ensure we have some dimensions
        const width = video.videoWidth || 640;
        const height = video.videoHeight || 360;
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error("Could not get 2d context");

        ctx.drawImage(video, 0, 0, width, height);
        const resultUrl = canvas.toDataURL('image/jpeg', 0.9);
        console.log("[page] Successfully captured frame, DataURL length:", resultUrl.length);
        cleanup();
        resolve(resultUrl);
      } catch (error) {
        console.error("[page] Error taking video snapshot from DataURL", error);
        cleanup();
        resolve(null);
      }
    };

    video.onloadeddata = () => {
      console.log("[page] onloadeddata fired, readyState:", video.readyState);
      if (video.readyState >= 2) {
        captureFrame();
      }
    };

    video.oncanplay = () => {
      console.log("[page] oncanplay fired, readyState:", video.readyState);
      if (video.readyState >= 2) {
        captureFrame();
      }
    };

    video.onerror = (e) => {
      console.error("[page] Error loading video for capture from DataURL", video.error);
      cleanup();
      resolve(null);
    };

    video.src = dataUrl;
    video.load();
    document.body.appendChild(video); // Some browsers need the element in the DOM to load correctly
  });
}


// Flag and counters to control fetch and track progress
let isFetchStopped = false;
let currentProgress = 0;
let totalItems = 0;
let abortController: AbortController | null = null;

// Track ongoing auto-fetch tasks (for Feature 2 real-time query)
// Map<pageUrl, status>
const activeAutoFetchTasks = new Map<string, "fetching" | "success" | "error">();

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
    const force = !!message.force;

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

    // Pre-filtering: skip already fetched thumbnails (UNLESS force is true)
    if (!force) {
      const allUrls = fetchTaskList.flatMap(task => task.items.map(item => item.pageUrl));
      const existingThumbs = await browser.storage.local.get(allUrls);

      for (const task of fetchTaskList) {
        task.items = task.items.filter(item => {
          const existing = existingThumbs[item.pageUrl];
          return !existing || (Array.isArray(existing) && existing.length === 0);
        });
      }
    }

    // Calculate total items
    totalItems = 0;
    for (const task of fetchTaskList) {
      totalItems += task.items.length;
    }
    currentProgress = 0;
    let successCount = 0;

    if (totalItems === 0) {
      logger.info("[Background] All items already have thumbnails, skipping fetch");
      browser.runtime.sendMessage({ type: messageId.getThumbfinished });
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
        // Activate the tab to prevent background throttling for video decoding
        await browser.tabs.update(tabId, { active: true });
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
          logger.info(`[Background] Target URL found: ${targetUrl} (Type: ${config.resultType})`);
          if (config.resultType === "video_url") {
            const chunkSizeMB = settings?.videoFetchChunkSize ?? 1.5;
            const maxRetries = settings?.videoFetchMaxRetries ?? 3;
            const totalAttempts = maxRetries + 1;
            const chunkSizeBytes = Math.floor(chunkSizeMB * 1024 * 1024);
            const fetchedChunks: Blob[] = [];

            // 尝试探测元数据大小
            const metadataEnd = await detectMp4MetadataEnd(targetUrl);
            let bytesFetched = 0;

            for (let i = 0; i < totalAttempts; i++) {
              let start = bytesFetched;
              let end = (i + 1) * chunkSizeBytes - 1;

              // 如果探测到了元数据且第一次请求太小，直接扩充到元数据末尾+一点冗余
              if (i === 0 && metadataEnd && end < metadataEnd + 256 * 1024) {
                end = metadataEnd + 256 * 1024; // 元数据 + 256KB 初始缓冲
                logger.info(`[Background] Smart Initial Fetch: Metadata ends at ${metadataEnd}, requesting up to ${end}`);
              } else if (start > end) {
                // 如果探测扩充后，下一次循环的 end 还没赶上，则平移到探测末尾开始
                end = start + chunkSizeBytes - 1;
              }

              logger.info(`[Background] Attempt ${i + 1}/${totalAttempts} to fetch video chunk for ${pageUrl} (Range: ${start}-${end})`);

              const chunk = await fetchVideoChunk(targetUrl, start, end);

              if (chunk) {
                fetchedChunks.push(chunk);
                bytesFetched = end + 1; // 更新已获取的字节边界

                const combinedBlob = new Blob(fetchedChunks);
                const videoDataUrl = await blobToDataUrl(combinedBlob);

                logger.info(`[Background] Video buffered to memory (Total size: ${combinedBlob.size} bytes) -> starting ISOLATED frame extraction...`);
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

              if (i < totalAttempts - 1) {
                logger.warn(`[Background] Frame extraction failed on attempt ${i + 1}, retrying with larger range...`);
              } else {
                logger.error(`[Background] Frame extraction failed after all ${totalAttempts} attempts`);
              }
            }
          } else {
            finalThumbUrl = targetUrl;
          }
        }

        if (finalThumbUrl) {
          const success = await saveThumb({ pageUrl, thumbUrl: finalThumbUrl });
          if (success) successCount++;
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
          const success = await saveThumb({ pageUrl, thumbUrl });
          if (success) successCount++;
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
    } else {
      browser.runtime.sendMessage({ type: messageId.getThumbfinished });
    }
  }
});


// ========== COVER STATUS: BADGE HELPERS ==========

async function getMatchedConfigForUrl(url: string): Promise<{ config: FetchConfig; hostname: string } | null> {
  try {
    const configsRaw = await browser.storage.local.get("__CONFIGS__");
    const configs: FetchConfig[] = (configsRaw["__CONFIGS__"] as FetchConfig[]) || [];

    const parsedUrl = new URL(url);
    const hostname = parsedUrl.hostname;

    for (const config of configs) {
      let configHostname = config.hostname;
      if (configHostname && configHostname.includes("://")) {
        try { configHostname = new URL(configHostname).hostname; } catch (_) { }
      }

      // Use includes for more flexible matching, like the options page
      if (hostname.includes(configHostname) || (configHostname && hostname.includes(configHostname))) {
        if (config.regexPattern) {
          const regex = new RegExp(config.regexPattern);
          if (!regex.test(url)) continue;
        }
        return { config, hostname: configHostname };
      }
    }
  } catch (e) {
    logger.warn("[Background] Error checking URL against configs", e);
  }
  return null;
}

async function hasCoverForUrl(url: string): Promise<boolean> {
  try {
    const result = await browser.storage.local.get(url);
    const raw = result[url] as any;
    return raw && Array.isArray(raw) && raw.length > 0;
  } catch (_) {
    return false;
  }
}

async function setBadgeForTab(tabId: number, status: "has-cover" | "no-cover" | "fetching" | "clear") {
  try {
    const actionAPI = browser.action || browser.browserAction;
    if (!actionAPI) return;
    switch (status) {
      case "has-cover":
        await actionAPI.setBadgeText({ text: "✓", tabId });
        await actionAPI.setBadgeBackgroundColor({ color: "#4caf50", tabId });
        break;
      case "no-cover":
        await actionAPI.setBadgeText({ text: "!", tabId });
        await actionAPI.setBadgeBackgroundColor({ color: "#ff9800", tabId });
        break;
      case "fetching":
        await actionAPI.setBadgeText({ text: "…", tabId });
        await actionAPI.setBadgeBackgroundColor({ color: "#2196f3", tabId });
        break;
      case "clear":
        await actionAPI.setBadgeText({ text: "", tabId });
        break;
    }
  } catch (_) { }
}

// Process a single page-mode item using an EXISTING tab (Feature 2: reuse the user's open tab)
async function processExistingTabForCover(
  tabId: number,
  pageUrl: string,
  config: FetchConfig,
  signal?: AbortSignal
): Promise<boolean> {
  const selector = config.selector!;
  const type = config.selectorType || "regex";
  const attribute = config.attribute;

  try {
    // Wait for tab to be fully loaded before executing script
    const tab = await browser.tabs.get(tabId);
    if (tab.status !== "complete") {
      // Wait for it to complete loading
      await new Promise<void>((resolve) => {
        const listener = (updatedId: number, changeInfo: any) => {
          if (updatedId === tabId && changeInfo.status === "complete") {
            browser.tabs.onUpdated.removeListener(listener);
            resolve();
          }
        };
        browser.tabs.onUpdated.addListener(listener);
        // Timeout after 15s
        setTimeout(() => {
          browser.tabs.onUpdated.removeListener(listener);
          resolve();
        }, 15000);
      });
    }

    const settingsRaw = await browser.storage.local.get(SETTINGS_KEY);
    const settings: Setting = settingsRaw[SETTINGS_KEY] as Setting;

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
        const chunkSizeMB = settings?.videoFetchChunkSize ?? 1.5;
        const maxRetries = settings?.videoFetchMaxRetries ?? 3;
        const totalAttempts = maxRetries + 1;
        const chunkSizeBytes = Math.floor(chunkSizeMB * 1024 * 1024);
        const fetchedChunks: Blob[] = [];

        const metadataEnd = await detectMp4MetadataEnd(targetUrl);
        let bytesFetched = 0;

        for (let i = 0; i < totalAttempts; i++) {
          let start = bytesFetched;
          let end = (i + 1) * chunkSizeBytes - 1;
          if (i === 0 && metadataEnd && end < metadataEnd + 256 * 1024) {
            end = metadataEnd + 256 * 1024;
          } else if (start > end) {
            end = start + chunkSizeBytes - 1;
          }

          const chunk = await fetchVideoChunk(targetUrl, start, end);
          if (chunk) {
            fetchedChunks.push(chunk);
            bytesFetched = end + 1;
            const combinedBlob = new Blob(fetchedChunks);
            const videoDataUrl = await blobToDataUrl(combinedBlob);

            const frameRes = await browser.scripting.executeScript({
              target: { tabId },
              func: videoDataUrlFrameExtractor,
              args: [videoDataUrl],
              world: "ISOLATED",
            });
            finalThumbUrl = frameRes?.[0]?.result;
            if (finalThumbUrl) break;
          }
          if (i < totalAttempts - 1) {
            logger.warn(`[Background] Frame extraction retry ${i + 1}/${totalAttempts} for existing tab`);
          }
        }
      } else {
        finalThumbUrl = targetUrl;
      }
    }

    if (finalThumbUrl) {
      const success = await saveThumb({ pageUrl, thumbUrl: finalThumbUrl });
      if (success) {
        // Notify the options page if it's open
        try {
          browser.runtime.sendMessage({
            type: messageId.singleThumbFinished,
            pageUrl,
            progress: 1,
            total: 1,
          });
        } catch (_) { }

        return true;
      }
    }

    return false;
  } catch (err) {
    logger.error("[Background] processExistingTabForCover failed", err);
  } finally {
    activeAutoFetchTasks.delete(pageUrl);
  }
  return false;
}


async function isUrlBookmarked(url: string): Promise<boolean> {
  try {
    const results = await browser.bookmarks.search({ url });
    return results.length > 0;
  } catch (_) {
    return false;
  }
}

// Fast-mode fetch using existing tab's URL (no tab opening needed)
async function fastFetchCoverForUrl(pageUrl: string, config: FetchConfig): Promise<boolean> {
  const selector = config.selector!;
  const type = config.selectorType || "regex";
  const attribute = config.attribute;

  try {
    const response = await fetch(pageUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      },
    });
    const html = await response.text();
    let thumbUrl: string | null | undefined = null;

    if (type === "regex") {
      const regex = new RegExp(selector);
      const match = html.match(regex);
      if (match && match[1]) thumbUrl = match[1];
    } else {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, "text/html");
      if (type === "css") {
        const element = doc.querySelector(selector);
        if (element) {
          thumbUrl = attribute
            ? element.getAttribute(attribute)
            : element.getAttribute("src") || element.getAttribute("content") || element.textContent;
        }
      } else if (type === "xpath") {
        const result = doc.evaluate(selector, doc, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
        const node = result.singleNodeValue;
        if (node) {
          if (node.nodeType === Node.ATTRIBUTE_NODE) thumbUrl = node.nodeValue;
          else if (node.nodeType === Node.ELEMENT_NODE) {
            const el = node as Element;
            thumbUrl = el.getAttribute("src") || el.getAttribute("content") || el.getAttribute("href") || el.textContent;
          } else thumbUrl = node.textContent;
        }
      }
    }

    if (thumbUrl) {
      thumbUrl = new URL(thumbUrl, pageUrl).toString();
      const success = await saveThumb({ pageUrl, thumbUrl });
      if (success) {
        try {
          browser.runtime.sendMessage({ type: messageId.singleThumbFinished, pageUrl, progress: 1, total: 1 });
        } catch (_) { }
        return true;
      }
    }
  } catch (err) {
    logger.error("[Background] fastFetchCoverForUrl failed", err);
  }
  return false;
}

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

  // Legacy Chrome handling removed; action/browserAction mapping handles this below.

  // Feature 2: Listen for tab navigation to matching pages
  browser.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    // Only react when the page finishes loading and has a URL
    if (changeInfo.status !== "complete" || !tab.url) return;

    const url = tab.url;
    // Ignore extension pages and browser-internal URLs
    if (url.startsWith("chrome://") || url.startsWith("moz-extension://") ||
      url.startsWith("chrome-extension://") || url.startsWith("about:") ||
      url.startsWith("file://")) {
      setBadgeForTab(tabId, "clear");
      return;
    }

    // Check if this URL matches any saved config
    const matched = await getMatchedConfigForUrl(url);
    if (!matched) {
      // Clear badge for non-matching pages
      setBadgeForTab(tabId, "clear");
      return;
    }

    const { config } = matched;

    // Check if this URL is actually bookmarked (to avoid fetching for every match in history)
    const bookmarked = await isUrlBookmarked(url);
    if (!bookmarked) return;

    // Check if a cover already exists for this page
    const hasCover = await hasCoverForUrl(url);
    if (hasCover) {
      setBadgeForTab(tabId, "has-cover");
      return;
    }

    // No cover yet - check if config has a selector to fetch it
    if (!config.selector) {
      setBadgeForTab(tabId, "no-cover");
      return;
    }

    // Show fetching badge and auto-fetch using the active tab
    setBadgeForTab(tabId, "fetching");
    logger.info(`[Background] Auto-fetching cover for matched page: ${url} (mode: ${config.mode})`);

    activeAutoFetchTasks.set(url, "fetching");

    let success = false;
    if (config.mode === "page") {
      // Reuse the existing tab the user has open
      success = await processExistingTabForCover(tabId, url, config);
    } else if (config.mode === "fast") {
      success = await fastFetchCoverForUrl(url, config);
      activeAutoFetchTasks.set(url, success ? "success" : "error");
      setTimeout(() => activeAutoFetchTasks.delete(url), 5000);
    }

    if (config.mode === "fast") {
      setBadgeForTab(tabId, success ? "has-cover" : "no-cover");
    }
  });

  browser.runtime.onMessage.addListener(async (message, sender) => {
    if (message.type === messageId.coverStatusQuery) {
      const { url } = message;
      const status = activeAutoFetchTasks.get(url);
      return { status };
    }
  });

  // Listener for new bookmarks to trigger auto-fetch if current tab matches
  browser.bookmarks.onCreated.addListener(async (id, bookmark) => {
    if (!bookmark.url) return;
    const url = bookmark.url;

    const matched = await getMatchedConfigForUrl(url);
    if (!matched) return;

    // Check if auto-fetch on bookmark is enabled
    const settingsRaw = await browser.storage.local.get(SETTINGS_KEY);
    const settings: Setting = settingsRaw[SETTINGS_KEY] as Setting;
    if (settings && settings.autoFetchOnBookmark === false) {
      return;
    }

    // Find if any tab has this URL open and is the active tab
    const tabs = await browser.tabs.query({ url });
    for (const tab of tabs) {
      if (tab.id && tab.active) {
        // Trigger the same logic as onUpdated
        // We can just rely on the fact that if it's newly bookmarked and matches config,
        // we should check it.
        const hasCover = await hasCoverForUrl(url);
        if (hasCover) {
          setBadgeForTab(tab.id, "has-cover");
          continue;
        }

        if (!matched.config.selector) {
          setBadgeForTab(tab.id, "no-cover");
          continue;
        }

        setBadgeForTab(tab.id, "fetching");
        activeAutoFetchTasks.set(url, "fetching");
        // TODO: Send notify after saving bookmarks.

        if (matched.config.mode === "page") {
          processExistingTabForCover(tab.id, url, matched.config).then(success => {
            setBadgeForTab(tab.id!, success ? "has-cover" : "no-cover");
          });
        } else {
          fastFetchCoverForUrl(url, matched.config).then(success => {
            setBadgeForTab(tab.id!, success ? "has-cover" : "no-cover");
            activeAutoFetchTasks.set(url, success ? "success" : "error");
            setTimeout(() => activeAutoFetchTasks.delete(url), 5000);
          });
        }
      }
    }
  });
 
  // Dynamic UI Setup based on settings
  async function setupUI() {
    const settingsRaw = await browser.storage.local.get(SETTINGS_KEY);
    const settings: Setting = settingsRaw[SETTINGS_KEY] as Setting;
    const clickAction = settings?.clickAction || "popup";

    const actionAPI = browser.action || browser.browserAction;

    // 1. Configure Extension Icon Click Behavior
    if (actionAPI) {
      if (clickAction === "options") {
        await actionAPI.setPopup({ popup: "" });
      } else {
        await actionAPI.setPopup({ popup: "popup.html" });
      }
    }

  }

  // Initial setup
  browser.runtime.onInstalled.addListener(() => {
    setupUI();
  });

  browser.runtime.onStartup.addListener(() => {
    setupUI();
  });

  // Handle Action Click (only fires if popup is "")
  const actionAPI = browser.action || browser.browserAction;
  if (actionAPI) {
    actionAPI.onClicked.addListener(() => {
      openUI();
    });
  }

  // Listen for settings changes to update UI immediately
  browser.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && changes[SETTINGS_KEY]) {
      setupUI();
    }
  });

});

