import { create, StateCreator } from "zustand";
import {
  Setting,
  BookmarkTreeNode,
  FetchConfig,
  FetchTask,
  BookmarkFetchItem,
  LoadedImageMap,
} from "../../global/types";
import {
  filterBookmarkByMatchPattern,
  checkBookmarksLoadStatus,
} from "../utils";

import { SETTINGS_KEY, CONFIGS_KEY } from "../consts";

type BookmarkMap = Record<string, BookmarkTreeNode>;

// export const loadedImageList: LoadedImage[] = [];

type storeState = {
  setting: Setting;
  bookmarkTree: BookmarkTreeNode | null;
  bookmarkList: BookmarkTreeNode[];
  bookmarkMap: BookmarkMap;
  // 所有匹配的书签（用于UI显示）
  matchedBookmarks: BookmarkTreeNode[];
  // 待获取封面的任务列表（只包含未加载的）
  fetchTaskList: FetchTask[];
  loadedImageMap: LoadedImageMap;
  fetchConfigList: FetchConfig[];
  // Fetch status
  isFetching: boolean;
  fetchProgress: number;
  fetchTotal: number;
  sidebarOpen: boolean;
  selectedFolderId: string;
  expandedFolderIds: string[];
};

type storeAction = {
  setSetting: (newSetting: Partial<Setting>) => Promise<void>;
  getSetting: () => Promise<void>;
  loadBookmarkTree: () => Promise<void>;
  matchBookmarks: () => Promise<{
    matchedBookmarks: BookmarkTreeNode[];
    fetchTaskList: FetchTask[];
  }>;
  updateLoadedImageMap: (newLoadedImageMap: LoadedImageMap) => void;
  loadFetchConfig: () => Promise<void>;
  setFetchConfig: (newConfig: FetchConfig, isUpdate: boolean) => Promise<void>;
  delFetchConfig: (delIdList: number[]) => Promise<void>;
  importConfigList: (newConfigList: FetchConfig[]) => Promise<void>;
  clearLoadedImageMap: () => void;
  // Fetch status actions
  setFetchStatus: (isFetching: boolean, total?: number) => void;
  updateFetchProgress: (progress: number) => void;
  loadSingleThumb: (pageUrl: string) => Promise<void>;
  stopFetching: () => void;
  setSelectedFolderId: (id: string) => void;
  setSidebarOpen: (open: boolean) => void;
  setExpandedFolderIds: (ids: string[]) => void;
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
      set(() => ({
        setting: storedSetting,
        sidebarOpen: storedSetting.sidebarOpen ?? true,
        selectedFolderId: storedSetting.selectedFolderId ?? "all",
        expandedFolderIds: storedSetting.expandedFolderIds ?? []
      }));
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
    }

    const bookmarkList = get().bookmarkList;
    if (!bookmarkList) {
      throw new Error("BookmarkList is empty.");
    }

    const allMatchedBookmarks: BookmarkTreeNode[] = [];
    const fetchTaskList: FetchTask[] = [];

    for (const config of configList) {
      const { hostname, regexPattern } = config;

      // 筛选匹配的书签
      const matchedBookmarks = filterBookmarkByMatchPattern(bookmarkList, {
        hostname,
        ...(regexPattern ? { regexPattern } : {}),
      });

      allMatchedBookmarks.push(...matchedBookmarks);

      // 检查加载状态并生成 FetchItem
      const { items, newLoadedImageMap } = await checkBookmarksLoadStatus(
        matchedBookmarks,
        config.id
      );

      // 更新已加载的图片映射
      if (Object.keys(newLoadedImageMap).length > 0) {
        get().updateLoadedImageMap(newLoadedImageMap);
      }

      // 只包含未加载的项目
      const unloadedItems = items.filter(item => !item.isLoaded);
      if (unloadedItems.length > 0) {
        fetchTaskList.push({
          config,
          items: unloadedItems,
        });
      }
    }

    const res = {
      matchedBookmarks: allMatchedBookmarks,
      fetchTaskList: fetchTaskList,
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
  clearLoadedImageMap: () => {
    set(() => ({ loadedImageMap: {} }));
  },
  setFetchStatus: (isFetching, total) => {
    set((state) => ({
      isFetching,
      ...(total !== undefined ? { fetchTotal: total, fetchProgress: 0 } : {}),
    }));
  },
  updateFetchProgress: (progress) => {
    set(() => ({ fetchProgress: progress }));
  },
  loadSingleThumb: async (pageUrl) => {
    try {
      const storageData = await browser.storage.local.get(pageUrl);
      const raw = storageData[pageUrl] as any;

      if (raw && raw.length > 0) {
        const buf = new Uint8Array(raw);
        const blob = new Blob([buf.buffer], { type: "image/jpeg" });
        const blobUrl = URL.createObjectURL(blob);

        const bookmarkList = get().bookmarkList;
        const newMapEntries: LoadedImageMap = {};

        bookmarkList.forEach((bk) => {
          if (bk.url === pageUrl) {
            newMapEntries[bk.id] = blobUrl;
          }
        });

        if (Object.keys(newMapEntries).length > 0) {
          get().updateLoadedImageMap(newMapEntries);
        }
      }
    } catch (e) {
      console.error(`Error loading single thumb for ${pageUrl}:`, e);
    }
  },
  stopFetching: () => {
    browser.runtime.sendMessage({ type: "stopFetch" });
    set(() => ({ isFetching: false }));
  },
  setSelectedFolderId: (id: string) => {
    set(() => ({ selectedFolderId: id }));
    get().setSetting({ selectedFolderId: id });
  },
  setSidebarOpen: (open: boolean) => {
    set(() => ({ sidebarOpen: open }));
    get().setSetting({ sidebarOpen: open });
  },
  setExpandedFolderIds: (ids: string[]) => {
    set(() => ({ expandedFolderIds: ids }));
    get().setSetting({ expandedFolderIds: ids });
  },
});

export const useStore = create<Store>()((...action) => ({
  setting: { darkMode: false, enableAnimations: true } as Setting,
  bookmarkTree: null as BookmarkTreeNode | null,
  bookmarkList: [] as BookmarkTreeNode[],
  bookmarkMap: {} as BookmarkMap,
  matchedBookmarks: [] as BookmarkTreeNode[],
  fetchTaskList: [] as FetchTask[],
  loadedImageMap: {} as LoadedImageMap,
  fetchConfigList: [] as FetchConfig[],
  // Fetch status init
  isFetching: false,
  fetchProgress: 0,
  fetchTotal: 0,
  sidebarOpen: true,
  selectedFolderId: "all",
  expandedFolderIds: [],
  ...actionSlice(...action),
}));
