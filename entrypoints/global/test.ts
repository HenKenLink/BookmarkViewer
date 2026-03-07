import { logger } from "./logger";
type CreateDetails = Browser.bookmarks.CreateDetails;
import { FetchConfig } from "./types";
import { CONFIGS_KEY } from "../options/consts";

// 添加parentId会报错
const testBookmarkList: CreateDetails[] = [
  // {
  //   title: "Teddy Bryce and Trenton Ducatti Fuckin Teddy Naked With",
  //   url: "https://thegay.com/videos/1161629/teddy-bryce-and-trenton-ducatti-fuckin-teddy-naked-with/?fr=1161629&rp=1",
  // },
  // {
  //   title: "Doms and Breeds Nerdy Sub at Dungeon East with Jay Austin and Teddy Bryce",
  //   url: "https://thegay.com/videos/1603735/doms-and-breeds-nerdy-sub-at-dungeon-east-with-jay-austin-and-teddy-bryce/?fr=1603735&rp=1",
  // },
  // {
  //   title: "Austin Finally Breeds Kip",
  //   url: "https://thegay.com/videos/1135577/austin-finally-breeds-kip/",
  // },
  {
    title: "Jeins Carter Ass",
    url: "https://www.boyfriendtv.com/es/videos/1581310/jeins-carter-ass-show-25-12-08/",
  },
  {
    title: "Stud Takes Huge Cock",
    url: "https://cc.boyfriendtv.com/pv/bftv/2026-02/pv_480af3e6c831906c44167c87211b5ea2.mp4",
  },
  {
    title: "Daddy Gets Pounded By BBC",
    url: "https://www.boyfriendtv.com/es/videos/1580900/daddy-gets-pounded-by-bbc/?tag=anal%20big%20cock%20interracial%20gay%20sex%20studs%20black",
  },
  {
    title: "Hairy Daddy Fucks Slut",
    url: "https://www.boyfriendtv.com/es/videos/1580766/hairy-daddy-fucks-slut/?tag=anal%20big%20cock%20blowjob%20gay%20sex%20studs%20black%20daddy",
  },
];

// https://www.boyfriendtv.com/es/videos/1301842/bottom-takes-a-monstercock-in-her-big-ass/

export async function testAddBookmarks() {
  logger.info("[Test] Starting to add test bookmarks...");
  for (const bk of testBookmarkList) {
    try {
      // Check if bookmark already exists to avoid redundant additions
      const existing = await browser.bookmarks.search({ url: bk.url });
      if (existing.length === 0) {
        await browser.bookmarks.create(bk);
      }
    } catch (e) {
      logger.error("Fail to add test bookmark:", bk.url, e);
    }
  }
}

// igayvideosFetchScript removed as it's now using simple mode

export const testFetchConfList: FetchConfig[] = [
  {
    id: 1,
    name: "Boyfriend TV fetch Video Thumbnail",
    hostname: "www.boyfriendtv.com",
    regexPattern:
      "^https:\\/\\/www\\.boyfriendtv\\.com(?:\\/es)?\\/videos\\/.+",
    selector: '"thumbnailUrl":\\["([^"]+)"',
    selectorType: 'regex',
    mode: "simple",
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
//     .then((blob) => logger.info("Valid blob url:", blob))
//     .catch((err) =>
//       logger.error("Not valid blob url, url has been revoked:", err)
//     );
// }
