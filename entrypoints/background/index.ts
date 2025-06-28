import { messageId } from "../global/message";
import {
  testAddBookmarks,
  testStorageConfig,
  // testGetScript,
} from "../global/test";
import { MatchedUrl, UnstoredUrl } from "../global/types";

import { waitForTabLoad, filterUnloadPageUrl } from "../global/globalUtils";
import { useStore } from "../options/store";

type Thumb = {
  pageUrl: string;
  thumbUrl: string;
};

browser.runtime.onMessage.addListener(async (message, sender) => {
  if (message.type === messageId.getThumb) {
    console.log("Message received!");
    const unStoredUrlList: UnstoredUrl[] = message.unStoredUrlList;
    console.log("matchedUrlList: ", unStoredUrlList);
    const code = "";
    // console.log("pageUrlList: ", pageUrlList);

    for (const url of unStoredUrlList) {
      console.log("Start to get thumb!");
      const pageUrlList: string[] = url.pageUrlList;
      const script = url.fetchScript;
      console.log("fetchScript: ", script);

      console.log("pageUrlList", pageUrlList);

      const hostname = url.hostname;
      const tabUrl = `https://${hostname}`;
      console.log("Hostname to open: ", hostname);
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
      let thumbList: Thumb[];
      if (res && res[0].result) {
        // @ts-ignore
        thumbList = res[0].result;
      } else {
        throw new Error("Fail to get cript execute result.");
      }
      console.log("thumbUrl: ", thumbList);

      for (const thumb of thumbList) {
        await saveThumb(thumb);
      }
      await browser.tabs.remove(tabId);
    }
  }
  browser.runtime.sendMessage({ type: messageId.getThumbfinished });
});

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
    console.log("Start to save image buf.");
    const buf = await response.arrayBuffer();
    const uintBuf = Array.from(new Uint8Array(buf));
    console.log("uintBuf: ", uintBuf);
    await browser.storage.local.set({
      [pageUrl]: uintBuf,
    });
  } catch (err) {
    console.error("Fail to download thumb.", err);
  }
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

export default defineBackground(async () => {
  if (__DEV__) {
    openUI();
    await testAddBookmarks();
    await testStorageConfig();
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
