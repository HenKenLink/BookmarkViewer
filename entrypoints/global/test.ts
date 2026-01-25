type CreateDetails = Browser.bookmarks.CreateDetails;
import { FetchConfig } from "./types";
import { CONFIGS_KEY } from "../options/consts";

// 添加parentId会报错
const testBookmarkList: CreateDetails[] = [
  // {
  //   index: 1,
  //   // parentId: "1",
  //   title: "Horsecock and Slut - BoyFriendTV.com",
  //   url: "https://www.boyfriendtv.com/videos/1277637/horsecock-and-slut/",
  // },
  {
    index: 1,
    // parentId: "1",
    title: "Nickoles A & YarddieStyle iGayVideos.TV",
    url: "https://www.igayvideos.tv/nickoles-a-yarddiestyle_2808271.html",
  },
  // {
  //   index: 1,
  //   // parentId: "1",
  //   title:
  //     "xxrickyhardxx - Igor Lucios (igorlucios) blindfolded and fucked raw by a sexy top - BoyFriendTV.com",
  //   url: "https://www.boyfriendtv.com/videos/1246998/xxrickyhardxx-igor-lucios-igorlucios-blindfolded-and-fucked-raw-by-a-sexy-top/",
  // },
  // {
  //   index: 1,
  //   // parentId: "1",
  //   title: "SANCHO GIVING UP THE BUSSY - BoyFriendTV.com",
  //   url: "https://www.boyfriendtv.com/videos/1124302/sancho-giving-up-the-bussy/",
  // },
  // {
  //   index: 1,
  //   // parentId: "1",
  //   title: "loc rios x yarddiestyle - BoyFriendTV.com",
  //   url: "https://www.boyfriendtv.com/videos/1277042/loc-rios-x-yarddiestyle/",
  // },
  // {
  //   index: 1,
  //   // parentId: "1",
  //   title: "Diego Sans Sucking ",
  //   url: "https://www.boyfriendtv.com/videos/1278367/diego-sans-sucking/",
  // },
];

// https://www.boyfriendtv.com/es/videos/1301842/bottom-takes-a-monstercock-in-her-big-ass/

export async function testAddBookmarks() {
  // for (const bk of testBookmarkList) {
  //   await browser.bookmarks.create(bk);
  // }
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

const igayvideosFetchScript = `
async function fetchThumb(pageUrlList) {
  const url = "https://www.igayvideos.tv/nickoles-a-yarddiestyle_2808271.html";
  const thumbList = [];
  try {
    const res = await fetch(url);
    const html = await res.text();

    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");

    const videos = doc.querySelectorAll("video");
    const posters = Array.from(videos)
      .map((video) => video.getAttribute("poster"))
      .filter(Boolean);

    if (posters.length === 0) {
      console.warn("页面中没有找到任何 video 的 poster");
    } else {
      console.log("抓取到的 poster URL：");
      posters.forEach((poster, idx) => {
        console.log('poster: ', poster);
      });
      const thumb = { pageUrl: pageUrlList[0], thumbUrl: posters[0] };
      return thumbList;
    }
  } catch (err) {
    console.error("获取失败：", err);
  }
}

async function main(pageUrlList) {
  console.log("Start to run inject scripts.");
  const thumbList = await fetchThumb(pageUrlList);
  console.log("Script execute result -> thumbList: ", thumbList);
  return thumbList;
}

return main(pageUrlList);
`;

export const testFetchConfList: FetchConfig[] = [
  {
    id: 1,
    name: "Boyfriend TV fetch Video Thumbnail",
    hostname: "www.boyfriendtv.com",
    regexPattern:
      "^https:\\/\\/www\\.boyfriendtv\\.com(?:\\/es)?\\/videos\\/.+",
    fetchScript: fetchScript,
  },
  {
    id: 2,
    name: "iGayVideos fetch Video Thumbnail",
    hostname: "www.igayvideos.tv",
    fetchScript: igayvideosFetchScript,
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
