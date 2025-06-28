import { create, StateCreator } from "zustand";
import {
  BookmarkTreeNode,
  MatchedUrl,
  UnstoredUrl,
  FetchConfig,
} from "../../global/types";
// import { get } from "http";
import {
  filterBookmarkByMatchPattern,
  loadPageUrlFromBookmarks,
} from "../utils";

import { PageUrl, LoadedImage } from "../../global/types";

type BookmarkMap = Record<string, BookmarkTreeNode>;

const fetchConfigStorageKey: string = "fetchConfigList";

// export const loadedImageList: LoadedImage[] = [];

type storeState = {
  // urlList: string[];
  bookmarkTree: BookmarkTreeNode | null;
  bookmarkList: BookmarkTreeNode[];
  bookmarkMap: BookmarkMap;
  matchedBookmarkList: BookmarkTreeNode[];
  matchedUrlList: MatchedUrl[];
  unStoredUrlList: UnstoredUrl[];
  loadedImageList: LoadedImage[];
  fetchConfigList: FetchConfig[];
};

type storeAction = {
  // setTabId: (newId: number | null) => void;
  loadBookmarkTree: () => Promise<void>;
  matchBookmarks: () => Promise<{
    matchedUrlList: MatchedUrl[];
    unStoredUrlList: UnstoredUrl[];
    matchedBookmarkList: BookmarkTreeNode[];
  }>;
  updateLoadedImageList: (newLoadedImageList: LoadedImage[]) => void;
  loadFetchConfig: () => Promise<void>;
};

type Store = storeState & storeAction;

export const actionSlice: StateCreator<Store, [], [], storeAction> = (
  set,
  get
) => ({
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

    if (!configList) {
      await get().loadFetchConfig();
      configList = get().fetchConfigList;
      // TODO:
      // alert("Fail to get config.");
      // throw new Error("Fail to get config.");
    }

    let matchedBookmarkList: BookmarkTreeNode[] = [];
    const matchedUrlList: MatchedUrl[] = [];
    const unStoredUrlList: UnstoredUrl[] = [];
    const bookmarkList = get().bookmarkList;
    if (!bookmarkList) {
      throw new Error("BookmarkList is empty.");
    }
    console.log("MatchBookmarks get bookmarkList result: ", bookmarkList);

    for (const config of configList) {
      const { id, hostname, regexPattern, fetchScript } = config;
      matchedBookmarkList = filterBookmarkByMatchPattern(bookmarkList, {
        hostname,
        regexPattern,
      });
      const res = await loadPageUrlFromBookmarks(matchedBookmarkList);
      const pageUrlList: PageUrl[] = res.pageUrlList;
      console.log("pageUrlList in matchBookmarks: ", pageUrlList);

      const matchedUrl: MatchedUrl = {
        configId: id,
        hostname: hostname,
        pageUrlList: pageUrlList,
        fetchScript: fetchScript,
      };
      matchedUrlList.push(matchedUrl);
      const unStoredPageUrlList: string[] = res.unStoredPageUrlList;
      console.log("unStoredPageUrlList: ", unStoredPageUrlList);
      if (unStoredPageUrlList && unStoredPageUrlList.length > 0) {
        unStoredUrlList.push({
          configId: id,
          hostname: hostname,
          pageUrlList: unStoredPageUrlList,
          fetchScript: fetchScript,
        });
      }
    }

    console.log("matchedUrlList in matchBookmarks: ", matchedUrlList);
    const res = {
      matchedUrlList: matchedUrlList,
      unStoredUrlList: unStoredUrlList,
      matchedBookmarkList: matchedBookmarkList,
    };
    set(() => res);
    return res;
  },
  updateLoadedImageList: (newLoadedImageList) => {
    set((state) => ({
      loadedImageList: [...state.loadedImageList, ...newLoadedImageList],
    }));
  },
  loadFetchConfig: async () => {
    const raw = await browser.storage.local.get(fetchConfigStorageKey);
    const fetchConfigList: FetchConfig[] = raw[fetchConfigStorageKey];
    console.log("fetchConfigList: ", fetchConfigList);
    set(() => ({ fetchConfigList: fetchConfigList }));
  },
});

export const useStore = create<Store>()((...action) => ({
  bookmarkTree: null as BookmarkTreeNode | null,
  bookmarkList: [] as BookmarkTreeNode[],
  bookmarkMap: {} as BookmarkMap,
  // matchedBookmarkList: [] as BookmarkTreeNode[],
  matchedBookmarkList: [] as BookmarkTreeNode[],
  matchedUrlList: [] as MatchedUrl[],
  unStoredUrlList: [] as UnstoredUrl[],
  loadedImageList: [] as LoadedImage[],
  fetchConfigList: [] as FetchConfig[],
  ...actionSlice(...action),
}));
