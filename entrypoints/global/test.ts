type CreateDetails = Browser.bookmarks.CreateDetails;
import { FetchConfig } from "./types";
import { CONFIGS_KEY } from "../options/consts";

// 添加parentId会报错
const testBookmarkList: CreateDetails[] = [
  {
    title: "Kenvin Nguyen & Tien Quan - BoyFriendTV.com",
    url: "https://www.boyfriendtv.com/videos/1255950/kenvin-nguyen-tien-quan-c3-teddy-teddy6859-c3-zero-s-men2024/",
  },
  {
    title: "Str8 guy shoots a big load - BoyFriendTV.com",
    url: "https://www.boyfriendtv.com/videos/1574084/str8-guy-shoots-a-big-load-riding-a-dildo/",
  },
  {
    title: "Nickoles A & YarddieStyle iGayVideos.TV",
    url: "https://www.igayvideos.tv/nickoles-a-yarddiestyle_2808271.html",
  },
  {
    title: "Loc Rios and David Christian (Dombeeef) fuck",
    url: "https://justthegays.tv/video/loc-rios-and-david-christian-dombeeef-fuck-91",
  },
  {
    title: "TheRealKingCock fucks Jaxx Cody (jaxx_cody)",
    url: "https://gayforfans.com/video/therealkingcock-fucks-jaxx-cody-jaxx_cody-1763044888/",
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
      method: "GET",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (X11; Linux x86_64; rv:139.0) Gecko/20100101 Firefox/139.0",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
        "Accept-Encoding": "gzip",
        Referer: "https://www.boyfriendtv.com/",
        Connection: "keep-alive",
        "Upgrade-Insecure-Requests": "1",
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "same-origin",
        "Sec-Fetch-User": "?1",
        Priority: "u=0, i",
        Pragma: "no-cache",
        "Cache-Control": "no-cache",
        TE: "trailers",
      },
    });

    const data = await response.text();

    console.log("Html response: ", data);

    return data; // 一定要返回字符串
  } catch (error) {
    console.error("Error:", error);
    throw error; // 抛出异常让调用方知道请求失败
  }
}

function extractThumbUrl(html) {
  console.log("Start to parse html.");
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  const scriptTag = doc.querySelector('script[type="application/ld+json"]');
  if (!scriptTag) {
    console.error("Fail to get script tag.");
    return null;
  }

  let jsonData;
  if (scriptTag.textContent) {
    try {
      jsonData = JSON.parse(scriptTag.textContent);
    } catch (e) {
      console.error("Fail to parse json data.");
      return null;
    }
  } else {
    console.error("Fail to get textContent from script tag.");
    return null;
  }
  // console.log("jsonData: ", jsonData);

  const thumbUrl = jsonData.thumbnailUrl[0];
  console.log("thumbUrl: ", thumbUrl);
  return thumbUrl;
}

async function fetchThumb(pageUrlList) {
  const thumbList = [];
  for (const pageUrl of pageUrlList) {
    const data = await fetchHtml(pageUrl);
    const thumbUrl = extractThumbUrl(data);
    if (!thumbUrl) {
      console.log("Fail to get thumbUrl, continue.");
      continue;
    }
    const thumb = { pageUrl: pageUrl, thumbUrl: thumbUrl };
    thumbList.push(thumb);
  }
  return thumbList;
}
async function main(pageUrlList) {
  console.log("Start to run inject scripts.");
  const thumbList = await fetchThumb(pageUrlList);
  console.log("Script execute result -> thumbList: ", thumbList);
  return thumbList;
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
