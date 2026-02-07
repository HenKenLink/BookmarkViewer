type CreateDetails = Browser.bookmarks.CreateDetails;
import { FetchConfig } from "./types";
import { CONFIGS_KEY } from "../options/consts";

// 添加parentId会报错
const testBookmarkList: CreateDetails[] = [
  {
    title: "Teddy Bryce and Trenton Ducatti Fuckin Teddy Naked With",
    url: "https://thegay.com/videos/1161629/teddy-bryce-and-trenton-ducatti-fuckin-teddy-naked-with/?fr=1161629&rp=1",
  },
  {
    title: "Doms and Breeds Nerdy Sub at Dungeon East with Jay Austin and Teddy Bryce",
    url: "https://thegay.com/videos/1603735/doms-and-breeds-nerdy-sub-at-dungeon-east-with-jay-austin-and-teddy-bryce/?fr=1603735&rp=1",
  },
  {
    title: "Austin Finally Breeds Kip",
    url: "https://thegay.com/videos/1135577/austin-finally-breeds-kip/",
  },
];

// https://www.boyfriendtv.com/es/videos/1301842/bottom-takes-a-monstercock-in-her-big-ass/

export async function testAddBookmarks() {
  console.log("[Test] Starting to add test bookmarks...");
  for (const bk of testBookmarkList) {
    try {
      // Check if bookmark already exists to avoid redundant additions
      const existing = await browser.bookmarks.search({ url: bk.url });
      if (existing.length === 0) {
        await browser.bookmarks.create(bk);
      }
    } catch (e) {
      console.error("Fail to add test bookmark:", bk.url, e);
    }
  }
}

const fetchScript = `
async function fetchHtml(url) {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Firefox/139.0",
        "Referer": "https://www.boyfriendtv.com/",
      },
    });
    if (!response.ok) throw new Error(\`HTTP error! status: \${response.status}\`);
    return await response.text();
  } catch (error) {
    console.error("FetchHtml Error:", error);
    throw error;
  }
}

function extractThumbUrl(html) {
  console.log("Parsing html...");
  const doc = new DOMParser().parseFromString(html, "text/html");
  const scriptTag = doc.querySelector('script[type="application/ld+json"]');
  
  if (!scriptTag?.textContent) {
    console.error("LD+JSON script tag not found.");
    return null;
  }

  try {
    const jsonData = JSON.parse(scriptTag.textContent);
    const thumbUrl = Array.isArray(jsonData.thumbnailUrl) 
      ? jsonData.thumbnailUrl[0] 
      : jsonData.thumbnailUrl;
      
    console.log("Extracted thumbUrl:", thumbUrl);
    return thumbUrl;
  } catch (e) {
    console.error("JSON parse error:", e);
    return null;
  }
}

async function fetchThumb(pageUrlList) {
  const results = [];
  for (const pageUrl of pageUrlList) {
    try {
      const html = await fetchHtml(pageUrl);
      const thumbUrl = extractThumbUrl(html);
      if (thumbUrl) {
        results.push({ pageUrl, thumbUrl });
      }
    } catch (e) {
      console.error(\`Failed for \${pageUrl}:\`, e);
    }
  }
  return results;
}

async function main(pageUrlList) {
  console.log("Script starting...");
  const results = await fetchThumb(pageUrlList);
  return { status: "finished", results };
}

return main(pageUrlList);
`;

// igayvideosFetchScript removed as it's now using simple mode

export const testFetchConfList: FetchConfig[] = [
  {
    id: 1,
    name: "Boyfriend TV fetch Video Thumbnail",
    hostname: "www.boyfriendtv.com",
    regexPattern:
      "^https:\\/\\/www\\.boyfriendtv\\.com(?:\\/es)?\\/videos\\/.+",
    fetchScript: fetchScript,
    mode: "inject",
  },
  {
    id: 2,
    name: "iGayVideos fetch Video Thumbnail",
    hostname: "www.igayvideos.tv",
    regexPattern: "^https:\\/\\/www\\.igayvideos\\.tv\\/.+",
    selector: 'poster="(.*?)"',
    mode: "simple",
  },
  {
    id: 3,
    name: "JustTheGays fetch Video Thumbnail",
    hostname: "justthegays.tv",
    regexPattern: "^https:\\/\\/justthegays\\.tv\\/video\\/.+",
    selector: '"thumbnailUrl":"(.*?)"',
    mode: "simple",
  },
  {
    id: 4,
    name: "GayForFans fetch Video Thumbnail",
    hostname: "gayforfans.com",
    regexPattern: "^https:\\/\\/gayforfans\\.com\\/video\\/.+",
    selector: 'poster="(.*?)"',
    mode: "simple",
  },
  {
    id: 5,
    name: "The Gay",
    hostname: "https://thegay.com/",
    regexPattern: "^https:\\/\\/thegay.com\\/videos\\/.+",
    selector: '"thumbnailUrl":"(.*?)"',
    mode: "open_simple",
  },
];

// const config = [{hostname:testHostname, script: }]

export async function testStorageConfig(): Promise<void> {
  await browser.storage.local.set({ [CONFIGS_KEY]: testFetchConfList });
}

// export async function testGetConfig(): Promise<FetchConfig[]> {
//   return await browser.storage.local.get("fetchConfigList");
// }

// call from console.
// function testBlobUrl() {
//   fetch(
//     "blob:moz-extension://af68e598-f819-4879-928c-c7e68d969e53/6a81730a-933f-4f73-aaa4-9391a4f52785"
//   )
//     .then((res) => res.blob())
//     .then((blob) => console.log("Valid blob url:", blob))
//     .catch((err) =>
//       console.error("Not valid blob url, url has been revoked:", err)
//     );
// }
