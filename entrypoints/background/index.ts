import { messageId } from "../global/message";
import {
  testAddBookmarks,
  testStorageConfig,
  // testGetScript,
} from "../global/test";
import { MatchedUrl, UnstoredUrl } from "../global/types";

import { waitForTabLoad, filterUnloadPageUrl } from "../global/globalUtils";
import { useStore } from "../options/store";
import { SelectorType } from "../global/types";

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

function dynamicExecutor(script: string, ...args: any[]): Function {
  try {
    const func = new Function(
      "pageUrlList",
      "messageId",
      `return (async () => {
      ${script}
    })();`
    );
    return func(...args);
  } catch (e) {
    console.error("Error executing dynamic script:", e);
    throw e;
  }
}

browser.runtime.onMessage.addListener(async (message, sender) => {
  if (message.type === messageId.getThumb) {
    const unStoredUrlList: UnstoredUrl[] = message.unStoredUrlList;

    for (const url of unStoredUrlList) {
      console.log(`[Background] Getting thumbnails for: ${url.hostname}`);
      const pageUrlList: string[] = url.pageUrlList;
      const script = url.fetchScript;
      const mode = url.mode || "inject";
      const selector = url.selector;

      let thumbList: Thumb[] = [];

      if (mode === "inject" && script) {
        const hostname = url.hostname;
        const tabUrl = `https://${hostname}`;
        const tab = await browser.tabs.create({
          url: tabUrl,
          active: false,
        });
        const tabId = tab.id!;
        await waitForTabLoad(tabId);
        const res = await browser.scripting.executeScript({
          target: { tabId },
          func: dynamicExecutor,
          args: [script, pageUrlList],
        });
        if (res && res[0].result) {
          // @ts-ignore
          thumbList = res[0].result;
        } else {
          console.error(`[Background] Failed to get script execution result for ${hostname}`);
        }
        await browser.tabs.remove(tabId);
      } else if (mode === "simple" && selector) {
        thumbList = await fetchSimpleThumb(
          pageUrlList,
          selector,
          url.selectorType || "regex",
          url.attribute
        );
      }

      for (const thumb of thumbList) {
        await saveThumb(thumb);
      }
    }
  }
  browser.runtime.sendMessage({ type: messageId.getThumbfinished });
});

export default defineBackground(async () => {
  await testStorageConfig();

  if (__DEV__) {
    openUI();
    await testAddBookmarks();
  }

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
