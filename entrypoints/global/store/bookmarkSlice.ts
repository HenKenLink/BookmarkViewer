import { StateCreator } from "zustand";
import {
  Setting,
  BookmarkTreeNode,
  FetchConfig,
  LoadedImageMap,
  FetchTask,
} from "../types";
import { filterBookmarkByMatchPattern, checkBookmarksLoadStatus } from "../bookmarkUtils";
import { SETTINGS_KEY, CONFIGS_KEY } from "../consts";

export type BookmarkMap = Record<string, BookmarkTreeNode>;

export type BookmarkSliceState = {
  setting: Setting;
  bookmarkTree: BookmarkTreeNode | null;
  bookmarkList: BookmarkTreeNode[];
  bookmarkMap: BookmarkMap;
  matchedBookmarks: BookmarkTreeNode[];
  loadedImageMap: LoadedImageMap;
  fetchConfigList: FetchConfig[];
  selectedFolderId: string;
  expandedFolderIds: string[];
  sidebarOpen: boolean;
  isLoadingBookmarks: boolean;
};

export type BookmarkSliceAction = {
  getSetting: () => Promise<void>;
  setSetting: (newSetting: Partial<Setting>) => Promise<void>;
  loadBookmarkTree: () => Promise<void>;
  loadFetchConfig: () => Promise<void>;
  matchBookmarks: () => Promise<{
    matchedBookmarks: BookmarkTreeNode[];
    fetchTaskList: FetchTask[];
  }>;
  updateLoadedImageMap: (newMap: LoadedImageMap) => void;
  setSelectedFolderId: (id: string) => void;
  setExpandedFolderIds: (ids: string[]) => void;
  setSidebarOpen: (open: boolean) => void;
  setLoadingBookmarks: (loading: boolean) => void;
};

export type BookmarkSlice = BookmarkSliceState & BookmarkSliceAction;

export const createBookmarkSlice: StateCreator<BookmarkSlice, [], [], BookmarkSlice> = (set, get) => ({
  setting: {
    darkMode: false,
    enableAnimations: true,
    pageModeConcurrency: 1,
    fastModeConcurrency: 3,
    fetchDelayCount: 5,
    fetchDelayTimeMin: 1000,
    fetchDelayTimeMax: 3000,
    enableDelay: false,
    logLevel: "info",
    favoriteFolderIds: [],
    showFavoriteFolders: true,
    favoriteFolderAliases: {},
    sidebarOpen: true,
    selectedFolderId: "all",
    expandedFolderIds: [],
    keepTabsOpen: false,
    videoFetchChunkSize: 1.5,
    videoFetchMaxRetries: 3,
    showActiveTabBanner: true,
    autoFetchOnBookmark: true,
    sortBy: "dateAdded",
    sortOrder: "desc",
    foldersPosition: "top",
    urlFilters: [],
    clickAction: "popup",
  } as unknown as Setting,
  bookmarkTree: null,
  bookmarkList: [],
  bookmarkMap: {},
  matchedBookmarks: [],
  loadedImageMap: {},
  fetchConfigList: [],
  selectedFolderId: "all",
  expandedFolderIds: [],
  sidebarOpen: true,
  isLoadingBookmarks: false,

  getSetting: async () => {
    const result = await browser.storage.local.get(SETTINGS_KEY);
    const storedSetting: Setting | undefined = result[SETTINGS_KEY] as Setting | undefined;
    if (storedSetting) {
      set({
        setting: storedSetting,
        sidebarOpen: storedSetting.sidebarOpen ?? true,
        selectedFolderId: storedSetting.selectedFolderId ?? "all",
        expandedFolderIds: storedSetting.expandedFolderIds ?? [],
      });
    }
  },

  setSetting: async (newSetting) => {
    const combinedSetting = { ...get().setting, ...newSetting };
    set({ setting: combinedSetting });
    await browser.storage.local.set({ [SETTINGS_KEY]: combinedSetting });
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
          if (node.children) node.children.forEach(iterate);
        }
      };
      iterate(tree);
    }
    set({ bookmarkTree: tree, bookmarkMap: map, bookmarkList: list });
  },

  loadFetchConfig: async () => {
    const raw = await browser.storage.local.get(CONFIGS_KEY);
    const fetchConfigList: FetchConfig[] = (raw[CONFIGS_KEY] as FetchConfig[]) || [];
    set({ fetchConfigList });
  },

  matchBookmarks: async () => {
    const configList = get().fetchConfigList;
    const bookmarkList = get().bookmarkList;
    if (!bookmarkList) return { matchedBookmarks: [], fetchTaskList: [] };

    const allMatchedBookmarks: BookmarkTreeNode[] = [];
    const fetchTaskList: FetchTask[] = [];
    const newLoadedImageMapAll: LoadedImageMap = {};

    for (const config of (configList || [])) {
      const { hostname, regexPattern } = config;
      const matchedBookmarks = filterBookmarkByMatchPattern(bookmarkList, {
        hostname,
        ...(regexPattern ? { regexPattern } : {}),
      });
      allMatchedBookmarks.push(...matchedBookmarks);

      const { items, newLoadedImageMap } = await checkBookmarksLoadStatus(
        matchedBookmarks,
        config.id,
        get().loadedImageMap
      );
      Object.assign(newLoadedImageMapAll, newLoadedImageMap);

      const unloadedItems = items.filter((item) => !item.isLoaded);
      if (unloadedItems.length > 0) {
        fetchTaskList.push({
          config,
          items: unloadedItems,
        });
      }
    }

    if (Object.keys(newLoadedImageMapAll).length > 0) {
      get().updateLoadedImageMap(newLoadedImageMapAll);
    }

    const res = { matchedBookmarks: allMatchedBookmarks, fetchTaskList };
    set(res);
    return res;
  },

  updateLoadedImageMap: (newMap) => {
    set((state) => ({ loadedImageMap: { ...state.loadedImageMap, ...newMap } }));
  },

  setSelectedFolderId: (id: string) => {
    set({ selectedFolderId: id });
    get().setSetting({ selectedFolderId: id });
  },

  setExpandedFolderIds: (ids: string[]) => {
    set({ expandedFolderIds: ids });
    get().setSetting({ expandedFolderIds: ids });
  },

  setSidebarOpen: (open: boolean) => {
    set({ sidebarOpen: open });
    get().setSetting({ sidebarOpen: open });
  },

  setLoadingBookmarks: (loading: boolean) => {
    set({ isLoadingBookmarks: loading });
  },
});
