import { create, StateCreator } from "zustand";
import {
  Setting,
  BookmarkTreeNode,
  MatchedUrl,
  UnstoredUrl,
  FetchConfig,
  LoadedImageMap,
} from "../../global/types";
// import { get } from "http";
import {
  filterBookmarkByMatchPattern,
  loadPageUrlFromBookmarks,
} from "../utils";

import { PageUrl, LoadedImage } from "../../global/types";

import { SETTINGS_KEY, CONFIGS_KEY } from "../consts";
import { Settings } from "@mui/icons-material";

type BookmarkMap = Record<string, BookmarkTreeNode>;

const fetchConfigStorageKey: string = "fetchConfigList";

// export const loadedImageList: LoadedImage[] = [];

type storeState = {
  // urlList: string[];
  setting: Setting;
  bookmarkTree: BookmarkTreeNode | null;
  bookmarkList: BookmarkTreeNode[];
  bookmarkMap: BookmarkMap;
  // TODO: `matchedBookmarkList` might be unnecessary.
  // Consider modifying `PageUrl` to:
  // { url: string; isLoaded: boolean; bookmarkId: string }
  // so we can find the corresponding bookmark via `matchedUrlList` using `bookmarkId`.
  matchedBookmarkList: BookmarkTreeNode[][];
  matchedUrlList: MatchedUrl[];
  unStoredUrlList: UnstoredUrl[];
  loadedImageMap: LoadedImageMap;
  fetchConfigList: FetchConfig[];
};

type storeAction = {
  setSetting: (newSetting: Partial<Setting>) => Promise<void>;
  getSetting: () => Promise<void>;
  loadBookmarkTree: () => Promise<void>;
  matchBookmarks: () => Promise<{
    matchedUrlList: MatchedUrl[];
    unStoredUrlList: UnstoredUrl[];
    matchedBookmarkList: BookmarkTreeNode[][];
  }>;
  updateLoadedImageMap: (newLoadedImageMap: LoadedImageMap) => void;
  loadFetchConfig: () => Promise<void>;
  setFetchConfig: (newConfig: FetchConfig, isUpdate: boolean) => Promise<void>;
  delFetchConfig: (delIdList: number[]) => Promise<void>;
  importConfigList: (newConfigList: FetchConfig[]) => Promise<void>;
};

type Store = storeState & storeAction;

export const actionSlice: StateCreator<Store, [], [], storeAction> = (
  set,
  get
) => ({
  setSetting: async (newSetting) => {
    const combinedSetting = { ...get().setting, ...newSetting };
    set(() => ({
      setting: combinedSetting,
    }));

    await browser.storage.local.set({ [SETTINGS_KEY]: combinedSetting });
  },
  getSetting: async () => {
    const result = await browser.storage.local.get(SETTINGS_KEY);
    const storedSetting: Setting | undefined = result[SETTINGS_KEY] as Setting | undefined;
    if (storedSetting) {
      set(() => ({ setting: storedSetting }));
    }
  },
  loadBookmarkTree: async () => {
    const tree = (await browser.bookmarks.getTree())[0];
    const map: BookmarkMap = {};
    const list: BookmarkTreeNode[] = [];
    if (tree) {
      const iterate = (node: BookmarkTreeNode) => {
        if (node) {
          map[node.id] = node;
          list.push(node);

          if (node.children) {
            node.children.forEach(iterate);
          }
        }
      };
      iterate(tree);
    }
    set(() => ({
      bookmarkTree: tree,
      bookmarkMap: map,
      bookmarkList: list,
    }));
  },
  matchBookmarks: async () => {
    let configList = get().fetchConfigList;

    if (!configList || configList.length === 0) {
      await get().loadFetchConfig();
      configList = get().fetchConfigList;
      // TODO:
      // alert("Fail to get config.");
      // throw new Error("Fail to get config.");
    }

    const matchedBookmarkList: BookmarkTreeNode[][] = [];
    const matchedUrlList: MatchedUrl[] = [];
    const unStoredUrlList: UnstoredUrl[] = [];
    const bookmarkList = get().bookmarkList;
    if (!bookmarkList) {
      throw new Error("BookmarkList is empty.");
    }

    for (const config of configList) {
      const { id, hostname, regexPattern, fetchScript, mode, selector, selectorType, attribute } = config;
      const bookmarkFilterRes = filterBookmarkByMatchPattern(bookmarkList, {
        hostname,
        ...(regexPattern ? { regexPattern } : {}),
      });

      matchedBookmarkList.push(bookmarkFilterRes);
      const res = await loadPageUrlFromBookmarks(bookmarkFilterRes);
      const pageUrlList: PageUrl[] = res.pageUrlList;

      const matchedUrl: MatchedUrl = {
        configId: id,
        hostname: hostname,
        pageUrlList: pageUrlList,
        fetchScript: fetchScript,
        mode: mode,
        selector: selector,
        selectorType: selectorType,
        attribute: attribute,
      };
      matchedUrlList.push(matchedUrl);
      const unStoredPageUrlList: string[] = res.unStoredPageUrlList;
      if (unStoredPageUrlList && unStoredPageUrlList.length > 0) {
        unStoredUrlList.push({
          configId: id,
          hostname: hostname,
          pageUrlList: unStoredPageUrlList,
          fetchScript: fetchScript,
          mode: mode,
          selector: selector,
          selectorType: selectorType,
          attribute: attribute,
        });
      }
    }

    // console.log("matchedUrlList in matchBookmarks: ", matchedUrlList);
    const res = {
      matchedUrlList: matchedUrlList,
      unStoredUrlList: unStoredUrlList,
      matchedBookmarkList: matchedBookmarkList,
    };
    set(() => res);
    return res;
  },
  updateLoadedImageMap: (newLoadedImageMap) => {
    set((state) => ({
      loadedImageMap: { ...state.loadedImageMap, ...newLoadedImageMap },
    }));
  },
  loadFetchConfig: async () => {
    const raw = await browser.storage.local.get(CONFIGS_KEY);
    const fetchConfigList: FetchConfig[] = raw[CONFIGS_KEY] as FetchConfig[];
    set(() => ({ fetchConfigList: fetchConfigList }));
  },
  setFetchConfig: async (newConfig, isUpdate) => {
    let newConfigList: FetchConfig[] = [];
    const configList = get().fetchConfigList;
    if (isUpdate) {
      const exists = configList.some((cfg) => cfg.id === newConfig.id);
      if (!exists) {
        throw new Error("Fail to update config, config not found.");
      }

      newConfigList = configList.map((cfg) =>
        cfg.id === newConfig.id ? newConfig : cfg
      );
    } else {
      newConfigList = [...configList, newConfig];
    }
    set(() => ({
      fetchConfigList: newConfigList,
    }));
    await browser.storage.local.set({ [CONFIGS_KEY]: newConfigList });
  },
  delFetchConfig: async (delIdList) => {
    const newConfigList: FetchConfig[] = get().fetchConfigList.filter(
      (config) => {
        return !delIdList.includes(config.id);
      }
    );
    set(() => ({ fetchConfigList: newConfigList }));
    await browser.storage.local.set({ [CONFIGS_KEY]: newConfigList });
  },
  importConfigList: async (newConfigList) => {
    set(() => ({ fetchConfigList: newConfigList }));
    await browser.storage.local.set({ [CONFIGS_KEY]: newConfigList });
  },
});

export const useStore = create<Store>()((...action) => ({
  setting: { darkMode: false, enableAnimations: true } as Setting,
  bookmarkTree: null as BookmarkTreeNode | null,
  bookmarkList: [] as BookmarkTreeNode[],
  bookmarkMap: {} as BookmarkMap,
  // matchedBookmarkList: [] as BookmarkTreeNode[],
  matchedBookmarkList: [] as BookmarkTreeNode[][],
  matchedUrlList: [] as MatchedUrl[],
  unStoredUrlList: [] as UnstoredUrl[],
  loadedImageMap: {} as LoadedImageMap,
  fetchConfigList: [] as FetchConfig[],
  ...actionSlice(...action),
}));
