import { logger } from "../global/logger";
import { messageId } from "../global/message";
import { FetchTask, FetchConfig, BookmarkFetchItem, SelectorType, Setting, ScreenshotType, MatchState, BookmarkTreeNode } from "../global/types";

import { waitForTabLoad } from "../global/globalUtils";
import { SETTINGS_KEY, CONFIGS_KEY, MATCH_STATE_KEY } from "../global/consts";

type Thumb = {
  pageUrl: string;
  thumbUrl: string;
};

// ========== SHARED UTILS ==========

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

async function updateCoverExists(url: string, exists: boolean) {
  try {
    const raw = await browser.storage.local.get(MATCH_STATE_KEY);
    const matchState = raw[MATCH_STATE_KEY] as MatchState | undefined;
    if (matchState && matchState.coverExistsMap) {
      if (matchState.coverExistsMap[url] !== exists) {
        matchState.coverExistsMap[url] = exists;
        await browser.storage.local.set({ [MATCH_STATE_KEY]: matchState });
      }
    }
  } catch (e) {
    logger.error("[Background] Failed to update coverExistsMap", e);
  }
}

async function saveThumb(thumb: Thumb): Promise<boolean> {
  const thumbUrl = thumb.thumbUrl;
  const pageUrl = thumb.pageUrl;
  try {
    let dataToSave: string;
    if (thumbUrl.startsWith("data:")) {
      dataToSave = thumbUrl;
    } else {
      const response = await fetch(thumbUrl);
      const blob = await response.blob();
      dataToSave = await blobToDataUrl(blob);
    }
    await browser.storage.local.set({
      [pageUrl]: dataToSave,
    });
    await updateCoverExists(pageUrl, true);
    return true;
  } catch (err) {
    logger.error(`[Background] Failed to download thumb from ${thumbUrl}`, err);
    return false;
  }
}

async function isUrlBookmarked(url: string): Promise<boolean> {
  try {
    const results = await browser.bookmarks.search({ url });
    return results.length > 0;
  } catch (_) {
    return false;
  }
}

async function hasCoverForUrl(url: string): Promise<boolean> {
  try {
    const result = await browser.storage.local.get(url);
    const raw = result[url] as any;
    return raw && ((Array.isArray(raw) && raw.length > 0) || (typeof raw === "string" && raw.startsWith("data:")));
  } catch (_) {
    return false;
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

// ========== PAGE & VIDEO HELPERS ==========

async function pageScriptExecutor(selector: string, type: string, attribute: string | null) {
  const getThumb = () => {
    const html = document.documentElement.outerHTML;
    let thumbUrl: string | null | undefined = null;

    if (type === "regex") {
      const regex = new RegExp(selector);
      const match = html.match(regex);
      if (match && match[1]) thumbUrl = match[1];
    } else {
      if (type === "css") {
        const element = document.querySelector(selector);
        if (element) {
          thumbUrl = attribute ? element.getAttribute(attribute) :
            element.getAttribute("src") || element.getAttribute("content") || element.textContent;
        }
      } else if (type === "xpath") {
        const result = document.evaluate(selector, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
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
      try { return new URL(thumbUrl, document.baseURI).href; } catch (e) { return thumbUrl; }
    }
    return null;
  };

  const startTime = Date.now();
  const timeout = 10000;
  while (Date.now() - startTime < timeout) {
    const thumbUrl = getThumb();
    if (thumbUrl) return thumbUrl;
    await new Promise(resolve => setTimeout(resolve, 500));
  }
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
    if (!res.ok) return null;
    return await res.blob();
  } catch (e) {
    logger.error("[Background] Error fetching video chunk", e);
    return null;
  }
}

async function detectMp4MetadataEnd(videoUrl: string): Promise<number | null> {
  try {
    const res = await fetch(videoUrl, {
      headers: { "Range": "bytes=0-131071", "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36" }
    });
    if (!res.ok) return null;
    const buffer = await res.arrayBuffer();
    const view = new DataView(buffer);
    let offset = 0;
    while (offset < view.byteLength - 8) {
      const size = view.getUint32(offset);
      const type = String.fromCharCode(view.getUint8(offset + 4), view.getUint8(offset + 5), view.getUint8(offset + 6), view.getUint8(offset + 7));
      if (type === 'moov') return offset + size;
      if (size <= 0 || size > 100 * 1024 * 1024) break;
      offset += size;
    }
  } catch (e) {}
  return null;
}

async function videoDataUrlFrameExtractor(dataUrl: string): Promise<string | null> {
  return new Promise<string | null>((resolve) => {
    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    video.style.position = 'fixed';
    video.style.top = '0';
    video.style.opacity = '0.01';
    video.style.zIndex = '-9999';

    const timeoutId = setTimeout(() => {
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
      } catch (e) {}
    };

    const captureFrame = () => {
      try {
        const canvas = document.createElement('canvas');
        const width = video.videoWidth || 640;
        const height = video.videoHeight || 360;
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error();
        ctx.drawImage(video, 0, 0, width, height);
        const resultUrl = canvas.toDataURL('image/jpeg', 0.9);
        cleanup();
        resolve(resultUrl);
      } catch (error) {
        cleanup();
        resolve(null);
      }
    };

    video.onloadeddata = () => { if (video.readyState >= 2) captureFrame(); };
    video.oncanplay = () => { if (video.readyState >= 2) captureFrame(); };
    video.onerror = () => { cleanup(); resolve(null); };
    video.src = dataUrl;
    video.load();
    document.body.appendChild(video);
  });
}

// ========== SCREENSHOT HELPERS ==========

async function getElementBoundingRect(selector: string, type: string) {
  let element: Element | null = null;
  if (type === "css") {
    element = document.querySelector(selector);
  } else if (type === "xpath") {
    const result = document.evaluate(selector, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
    const node = result.singleNodeValue;
    if (node && node.nodeType === Node.ELEMENT_NODE) element = node as Element;
  }

  if (element) {
    element.scrollIntoView({ behavior: 'instant', block: 'center' });
    const rect = element.getBoundingClientRect();
    return { x: rect.x, y: rect.y, width: rect.width, height: rect.height, dpr: window.devicePixelRatio };
  }
  return null;
}

async function cropImageWithCanvas(dataUrl: string, rect: { x: number, y: number, width: number, height: number, dpr: number }): Promise<string> {
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  const bitmap = await createImageBitmap(blob);
  const realX = Math.round(rect.x * rect.dpr);
  const realY = Math.round(rect.y * rect.dpr);
  const realWidth = Math.round(rect.width * rect.dpr);
  const realHeight = Math.round(rect.height * rect.dpr);
  const canvas = new OffscreenCanvas(realWidth, realHeight);
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(bitmap, realX, realY, realWidth, realHeight, 0, 0, realWidth, realHeight);
  const croppedBlob = await canvas.convertToBlob({ type: 'image/png' });
  return await blobToDataUrl(croppedBlob);
}

async function processScreenshotItem(pageUrl: string, config: FetchConfig, progressReporter?: (progressDelta: number) => void): Promise<void> {
  let windowId: number | undefined;
  try {
    const targetWidth = config.screenshotWidth || 1280;
    const targetHeight = config.screenshotHeight || 720;
    const delayMs = config.screenshotDelay || 2000;

    const win = await browser.windows.create({
      url: pageUrl, type: "popup", width: targetWidth, height: targetHeight, focused: false, state: "normal",
    });
    windowId = win?.id;
    if (!win || !windowId || !win.tabs || win.tabs.length === 0) throw new Error("Window failed");
    const tabId = win.tabs[0].id!;

    await waitForTabLoad(tabId, 30000);

    // Viewport Compensation & Styling
    await browser.scripting.executeScript({
      target: { tabId },
      func: () => {
        const style = document.createElement('style');
        style.textContent = `::-webkit-scrollbar { display: none !important; } html, body { overflow: hidden !important; scrollbar-width: none !important; }`;
        document.head.appendChild(style);
        return { innerWidth: window.innerWidth, innerHeight: window.innerHeight, outerWidth: window.outerWidth, outerHeight: window.outerHeight };
      },
      world: "MAIN"
    }).then(async (res) => {
      const dims = res?.[0]?.result;
      if (dims) {
        const widthDiff = dims.outerWidth - dims.innerWidth;
        const heightDiff = dims.outerHeight - dims.innerHeight;
        await browser.windows.update(windowId!, { width: targetWidth + widthDiff, height: targetHeight + heightDiff });
        try { await browser.tabs.setZoom(tabId, 1); } catch(_) {}
      }
    });

    if (delayMs > 0) await new Promise(resolve => setTimeout(resolve, delayMs));

    let dataUrl: string | undefined;
    if (config.screenshotType === "full") {
      dataUrl = await browser.tabs.captureVisibleTab(windowId, { format: "png" });
    } else if ((config.screenshotType === "css" || config.screenshotType === "xpath") && config.selector) {
      const res = await browser.scripting.executeScript({
        target: { tabId }, func: getElementBoundingRect, args: [config.selector, config.screenshotType], world: "MAIN",
      });
      const rect = res?.[0]?.result;
      if (!rect) throw new Error("Element not found");
      const fullViewportDataUrl = await browser.tabs.captureVisibleTab(windowId, { format: "png" });
      dataUrl = await cropImageWithCanvas(fullViewportDataUrl, rect);
    }

    if (dataUrl) {
      const success = await saveThumb({ pageUrl, thumbUrl: dataUrl });
      if (success && progressReporter) progressReporter(1);
      else if (!success) browser.runtime.sendMessage({ type: messageId.fetchFailed, pageUrl });
    } else {
      browser.runtime.sendMessage({ type: messageId.fetchFailed, pageUrl });
    }
  } catch (err) {
    logger.error(`[Background] Screenshot failed for ${pageUrl}`, err);
    browser.runtime.sendMessage({ type: messageId.fetchFailed, pageUrl });
  } finally {
    if (windowId) try { await browser.windows.remove(windowId); } catch (e) {}
  }
}

// ========== MATCH STATE COMPUTATION ==========

let matchStateDebounceTimer: number | NodeJS.Timeout | null = null;

async function computeAndSaveMatchState() {
  try {
    const [treeResult, configsRaw] = await Promise.all([
      browser.bookmarks.getTree(),
      browser.storage.local.get(CONFIGS_KEY)
    ]);
    const tree = treeResult[0];
    const configs: FetchConfig[] = (configsRaw[CONFIGS_KEY] as FetchConfig[]) || [];

    const bookmarkMap: Record<string, BookmarkTreeNode> = {};
    const bookmarksByHost: Record<string, BookmarkTreeNode[]> = {};
    const bookmarkList: BookmarkTreeNode[] = [];

    const iterate = (node: BookmarkTreeNode) => {
      if (node) {
        bookmarkMap[node.id] = node;
        bookmarkList.push(node);
        if (node.children) node.children.forEach(iterate);
      }
    };
    if (tree) iterate(tree);

    for (const bk of bookmarkList) {
      if (!bk.url) continue;
      try {
        const host = new URL(bk.url).hostname;
        if (!bookmarksByHost[host]) bookmarksByHost[host] = [];
        bookmarksByHost[host].push(bk);
      } catch (_) {}
    }

    const configsByHost: Record<string, FetchConfig[]> = {};
    for (const config of configs) {
      let host = config.hostname;
      if (host.includes("://")) {
        try { host = new URL(host).hostname; } catch (_) {}
      }
      if (!configsByHost[host]) configsByHost[host] = [];
      configsByHost[host].push(config);
    }

    const matchedBookmarkIds = new Set<string>();
    const bookmarkToConfigsMap: Record<string, number[]> = {};
    const urlsToFetch = new Set<string>();

    for (const host in configsByHost) {
      const bksAtHost = bookmarksByHost[host];
      if (!bksAtHost) continue;

      for (const config of configsByHost[host]) {
        const regex = config.regexPattern ? new RegExp(config.regexPattern) : null;
        const matchedAtHost = regex
          ? bksAtHost.filter(bk => regex.test(bk.url!))
          : bksAtHost;

        for (const bk of matchedAtHost) {
          matchedBookmarkIds.add(bk.id);
          if (!bookmarkToConfigsMap[bk.id]) bookmarkToConfigsMap[bk.id] = [];
          bookmarkToConfigsMap[bk.id].push(config.id);
          if (bk.url) urlsToFetch.add(bk.url);
        }
      }
    }

    // Check which URLs have covers
    const storageData = urlsToFetch.size > 0 ? await browser.storage.local.get(Array.from(urlsToFetch)) : {};
    const coverExistsMap: Record<string, boolean> = {};

    for (const url of urlsToFetch) {
      const raw = storageData[url];
      if (raw && ((Array.isArray(raw) && raw.length > 0) || (typeof raw === "string" && raw.startsWith("data:")))) {
        coverExistsMap[url] = true;
      } else {
        coverExistsMap[url] = false;
      }
    }

    const matchState: MatchState = {
      matchedBookmarkIds: Array.from(matchedBookmarkIds),
      bookmarkToConfigsMap,
      coverExistsMap,
    };

    await browser.storage.local.set({ [MATCH_STATE_KEY]: matchState });
    logger.info("[Background] Match state computed and saved.");

  } catch (error) {
    logger.error("[Background] Failed to compute match state", error);
  }
}

function triggerMatchStateCompute() {
  if (matchStateDebounceTimer) clearTimeout(matchStateDebounceTimer);
  matchStateDebounceTimer = setTimeout(() => {
    computeAndSaveMatchState();
  }, 1000); // 1s debounce
}

// ========== MAIN BACKGROUND LOGIC ==========

let isFetchStopped = false;
const activeAutoFetchTasks = new Map<string, "fetching" | "success" | "error">();

async function runWithConcurrency<T>(items: T[], concurrency: number, fn: (item: T) => Promise<void>, shouldStop: () => boolean): Promise<void> {
  let index = 0;
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (index < items.length && !shouldStop()) {
      const currentIndex = index++;
      await fn(items[currentIndex]);
    }
  });
  await Promise.all(workers);
}

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
      if (hostname.includes(configHostname) || (configHostname && hostname.includes(configHostname))) {
        if (config.regexPattern) {
          const regex = new RegExp(config.regexPattern);
          if (!regex.test(url)) continue;
        }
        return { config, hostname: configHostname };
      }
    }
  } catch (e) {}
  return null;
}

async function setBadgeForTab(tabId: number, status: "has-cover" | "no-cover" | "fetching" | "clear") {
  try {
    const actionAPI = browser.action || browser.browserAction;
    if (!actionAPI) return;
    const colors = { "has-cover": "#4caf50", "no-cover": "#ff9800", "fetching": "#2196f3", "clear": "" };
    const texts = { "has-cover": "✓", "no-cover": "!", "fetching": "…", "clear": "" };
    await actionAPI.setBadgeText({ text: texts[status], tabId });
    if (status !== "clear") await actionAPI.setBadgeBackgroundColor({ color: colors[status], tabId });
  } catch (_) { }
}

async function processExistingTabForCover(tabId: number, pageUrl: string, config: FetchConfig): Promise<boolean> {
  try {
    const tab = await browser.tabs.get(tabId);
    if (tab.status !== "complete") {
      await new Promise<void>((resolve) => {
        const listener = (updatedId: number, changeInfo: any) => {
          if (updatedId === tabId && changeInfo.status === "complete") {
            browser.tabs.onUpdated.removeListener(listener);
            resolve();
          }
        };
        browser.tabs.onUpdated.addListener(listener);
        setTimeout(() => { browser.tabs.onUpdated.removeListener(listener); resolve(); }, 15000);
      });
    }

    const settingsRaw = await browser.storage.local.get(SETTINGS_KEY);
    const settings: Setting = settingsRaw[SETTINGS_KEY] as Setting;

    const res = await browser.scripting.executeScript({
      target: { tabId }, func: pageScriptExecutor, args: [config.selector!, config.selectorType || "regex", config.attribute ?? null], world: "MAIN",
    });

    const targetUrl = res?.[0]?.result;
    let finalThumbUrl: string | null | undefined = null;

    if (targetUrl) {
      if (config.resultType === "video_url") {
        const metadataEnd = await detectMp4MetadataEnd(targetUrl);
        const chunkSizeBytes = Math.floor((settings?.videoFetchChunkSize ?? 1.5) * 1024 * 1024);
        let bytesFetched = 0;
        for (let i = 0; i < (settings?.videoFetchMaxRetries ?? 3) + 1; i++) {
          let start = bytesFetched, end = (i + 1) * chunkSizeBytes - 1;
          if (i === 0 && metadataEnd && end < metadataEnd + 256 * 1024) end = metadataEnd + 256 * 1024;
          else if (start > end) end = start + chunkSizeBytes - 1;
          const chunk = await fetchVideoChunk(targetUrl, start, end);
          if (chunk) {
            bytesFetched = end + 1;
            const videoDataUrl = await blobToDataUrl(new Blob([chunk]));
            const frameRes = await browser.scripting.executeScript({
              target: { tabId }, func: videoDataUrlFrameExtractor, args: [videoDataUrl], world: "ISOLATED",
            });
            finalThumbUrl = frameRes?.[0]?.result;
            if (finalThumbUrl) break;
          }
        }
      } else finalThumbUrl = targetUrl;
    }

    if (finalThumbUrl) {
      const success = await saveThumb({ pageUrl, thumbUrl: finalThumbUrl });
      if (success) {
        browser.runtime.sendMessage({ type: messageId.singleThumbFinished, pageUrl, progress: 1, total: 1 });
        return true;
      }
    }
    browser.runtime.sendMessage({ type: messageId.fetchFailed, pageUrl });
    return false;
  } catch (err) {
    browser.runtime.sendMessage({ type: messageId.fetchFailed, pageUrl });
  } finally {
    activeAutoFetchTasks.delete(pageUrl);
  }
  return false;
}

async function fastFetchCoverForUrl(pageUrl: string, config: FetchConfig): Promise<boolean> {
  try {
    const response = await fetch(pageUrl, { headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36" } });
    const html = await response.text();
    let thumbUrl: string | null | undefined = null;
    const type = config.selectorType || "regex";
    const selector = config.selector!;

    if (type === "regex") {
      const match = html.match(new RegExp(selector));
      if (match && match[1]) thumbUrl = match[1];
    } else {
      const doc = new DOMParser().parseFromString(html, "text/html");
      if (type === "css") {
        const element = doc.querySelector(selector);
        if (element) thumbUrl = config.attribute ? element.getAttribute(config.attribute) : element.getAttribute("src") || element.getAttribute("content") || element.textContent;
      } else if (type === "xpath") {
        const node = doc.evaluate(selector, doc, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
        if (node) {
          if (node.nodeType === Node.ATTRIBUTE_NODE) thumbUrl = node.nodeValue;
          else if (node.nodeType === Node.ELEMENT_NODE) thumbUrl = (node as Element).getAttribute("src") || (node as Element).getAttribute("content") || (node as Element).getAttribute("href") || node.textContent;
          else thumbUrl = node.textContent;
        }
      }
    }

    if (thumbUrl) {
      const success = await saveThumb({ pageUrl, thumbUrl: new URL(thumbUrl, pageUrl).toString() });
      if (success) {
        browser.runtime.sendMessage({ type: messageId.singleThumbFinished, pageUrl, progress: 1, total: 1 });
        return true;
      }
    }
    browser.runtime.sendMessage({ type: messageId.fetchFailed, pageUrl });
  } catch (err) {
    browser.runtime.sendMessage({ type: messageId.fetchFailed, pageUrl });
  }
  return false;
}

export default defineBackground(() => {
  (async () => {
    if (__DEV__) {
      const { testStorageConfig, testAddBookmarks } = await import("../global/test");
      await testStorageConfig();
      await testAddBookmarks();
      openUI();
    }
    triggerMatchStateCompute();
  })();

  browser.runtime.onMessage.addListener(async (message) => {
    if (message.type === messageId.stopFetch) {
      isFetchStopped = true;
      return;
    }
    if (message.type === messageId.getThumb) {
      isFetchStopped = false;
      const fetchTaskList: FetchTask[] = message.fetchTaskList;
      const settingsRaw = await browser.storage.local.get(SETTINGS_KEY);
      const settings: Setting = settingsRaw[SETTINGS_KEY] as Setting;
      const pageModeConcurrency = Math.max(1, Math.min(settings?.pageModeConcurrency || 1, 5));
      const fastModeConcurrency = Math.max(1, Math.min(settings?.fastModeConcurrency || 3, 10));

      let totalItemsCount = 0;
      for (const task of fetchTaskList) totalItemsCount += task.items.length;
      let currentProgress = 0, successCount = 0;

      browser.runtime.sendMessage({ type: messageId.fetchStarted, total: totalItemsCount });

      const updateProgress = (pageUrl: string, successDelta: number = 0) => {
        currentProgress++;
        successCount += successDelta;
        browser.runtime.sendMessage({ type: messageId.singleThumbFinished, pageUrl, progress: currentProgress, total: totalItemsCount });
        if (successDelta === 0) {
          browser.runtime.sendMessage({ type: messageId.fetchFailed, pageUrl });
        }
      };

      for (const task of fetchTaskList) {
        if (isFetchStopped) break;
        const config = task.config;
        const pageUrlList = task.items.map(item => item.pageUrl);

        if (config.mode === "page" && config.selector) {
          const tabIds = [];
          for (let i = 0; i < Math.min(pageModeConcurrency, pageUrlList.length); i++) {
            const tab = await browser.tabs.create({ url: "about:blank", active: false });
            tabIds.push(tab.id!);
          }
          const availableTabs = [...tabIds];
          await runWithConcurrency(pageUrlList, tabIds.length, async (url) => {
            const tabId = availableTabs.pop()!;
            try {
              // Internal processPageItem logic
              await browser.tabs.update(tabId, { active: true, url });
              await waitForTabLoad(tabId, 30000);
              const res = await browser.scripting.executeScript({ target: { tabId }, func: pageScriptExecutor, args: [config.selector!, config.selectorType || "regex", config.attribute ?? null], world: "MAIN" });
              const targetUrl = res?.[0]?.result;
              if (targetUrl) {
                const success = await saveThumb({ pageUrl: url, thumbUrl: targetUrl });
                updateProgress(url, success ? 1 : 0);
              } else updateProgress(url);
            } finally { availableTabs.push(tabId); }
          }, () => isFetchStopped);
          if (!settings?.keepTabsOpen) for (const id of tabIds) try { await browser.tabs.remove(id); } catch(_) {}
        } else if (config.mode === "fast" && config.selector) {
          await runWithConcurrency(pageUrlList, fastModeConcurrency, async (url) => {
            const success = await fastFetchCoverForUrl(url, config);
            updateProgress(url, success ? 1 : 0);
          }, () => isFetchStopped);
        } else if (config.mode === "screenshot") {
          await runWithConcurrency(pageUrlList, pageModeConcurrency, async (url) => {
            await processScreenshotItem(url, config, (delta) => {
              updateProgress(url, delta);
            });
            if (currentProgress < totalItemsCount && !isFetchStopped) {
              // updateProgress was called inside processScreenshotItem via reporter, but if it fails it might not be.
              // Actually we should ensure updateProgress is called exactly once.
            }
          }, () => isFetchStopped);
        }
      }
      browser.runtime.sendMessage({ type: isFetchStopped ? messageId.fetchStopped : messageId.getThumbfinished });
    }
    if (message.type === messageId.coverStatusQuery) {
      return { status: activeAutoFetchTasks.get(message.url) };
    }
  });

  browser.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    if (changeInfo.status !== "complete" || !tab.url) return;
    const url = tab.url;
    if (url.startsWith("chrome://") || url.startsWith("moz-extension://") || url.startsWith("about:") || url.startsWith("file://")) return;
    const matched = await getMatchedConfigForUrl(url);
    if (!matched || !(await isUrlBookmarked(url)) || (await hasCoverForUrl(url))) {
      if (matched) setBadgeForTab(tabId, (await hasCoverForUrl(url)) ? "has-cover" : "clear");
      return;
    }
    if (!matched.config.selector && matched.config.mode !== "screenshot") { setBadgeForTab(tabId, "no-cover"); return; }
    
    setBadgeForTab(tabId, "fetching");
    activeAutoFetchTasks.set(url, "fetching");
    let success = false;
    if (matched.config.mode === "page") success = await processExistingTabForCover(tabId, url, matched.config);
    else if (matched.config.mode === "fast") success = await fastFetchCoverForUrl(url, matched.config);
    else if (matched.config.mode === "screenshot") {
      await processScreenshotItem(url, matched.config);
      success = await hasCoverForUrl(url);
    }
    setBadgeForTab(tabId, success ? "has-cover" : "no-cover");
  });

  browser.bookmarks.onCreated.addListener(async (id, bookmark) => {
    triggerMatchStateCompute();
    if (!bookmark.url) return;
    const matched = await getMatchedConfigForUrl(bookmark.url);
    if (!matched) return;
    const settings = (await browser.storage.local.get(SETTINGS_KEY))[SETTINGS_KEY] as Setting;
    if (settings?.autoFetchOnBookmark === false) return;
    const tabs = await browser.tabs.query({ url: bookmark.url });
    for (const tab of tabs) {
      if (tab.id && tab.active) {
        if (await hasCoverForUrl(bookmark.url)) { setBadgeForTab(tab.id, "has-cover"); continue; }
        setBadgeForTab(tab.id, "fetching");
        activeAutoFetchTasks.set(bookmark.url, "fetching");
        if (matched.config.mode === "page") processExistingTabForCover(tab.id, bookmark.url, matched.config).then(s => setBadgeForTab(tab.id!, s ? "has-cover" : "no-cover"));
        else if (matched.config.mode === "fast") fastFetchCoverForUrl(bookmark.url, matched.config).then(s => setBadgeForTab(tab.id!, s ? "has-cover" : "no-cover"));
        else if (matched.config.mode === "screenshot") processScreenshotItem(bookmark.url, matched.config).then(() => setBadgeForTab(tab.id!, "has-cover")).catch(() => setBadgeForTab(tab.id!, "no-cover"));
      }
    }
  });
 
  browser.bookmarks.onChanged.addListener(triggerMatchStateCompute);
  browser.bookmarks.onRemoved.addListener(triggerMatchStateCompute);
  browser.bookmarks.onMoved.addListener(triggerMatchStateCompute);
 
  async function setupUI() {
    const settings = (await browser.storage.local.get(SETTINGS_KEY))[SETTINGS_KEY] as Setting;
    const actionAPI = browser.action || browser.browserAction;
    if (actionAPI) await actionAPI.setPopup({ popup: settings?.clickAction === "options" ? "" : "popup.html" });
  }

  browser.runtime.onInstalled.addListener(() => {
    setupUI();
    triggerMatchStateCompute();
  });
  browser.runtime.onStartup.addListener(() => {
    setupUI();
    triggerMatchStateCompute();
  });
  const actionAPI = browser.action || browser.browserAction;
  if (actionAPI) actionAPI.onClicked.addListener(openUI);
  browser.storage.onChanged.addListener((changes, area) => { 
    if (area === "local") {
      if (changes[SETTINGS_KEY]) setupUI(); 
      if (changes[CONFIGS_KEY]) triggerMatchStateCompute();
    }
  });
});
