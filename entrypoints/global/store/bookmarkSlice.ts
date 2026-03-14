import { StateCreator } from "zustand";
import {
  Setting,
  BookmarkTreeNode,
  FetchConfig,
  MatchState,
} from "../types";
import { SETTINGS_KEY, CONFIGS_KEY, MATCH_STATE_KEY } from "../consts";

export type BookmarkMap = Record<string, BookmarkTreeNode>;
export type BookmarksByHost = Record<string, BookmarkTreeNode[]>;

export type BookmarkSliceState = {
  setting: Setting;
  bookmarkTree: BookmarkTreeNode | null;
  bookmarkList: BookmarkTreeNode[];
  bookmarkMap: BookmarkMap;
  bookmarksByHost: BookmarksByHost;
  matchedBookmarks: BookmarkTreeNode[];
  matchedBookmarkIds: string[];
  bookmarkToConfigsMap: Record<string, number[]>;
  coverExistsMap: Record<string, boolean>;
  fetchConfigList: FetchConfig[];
  selectedFolderId: string;
  selectedConfigGroupId: string;
  expandedFolderIds: string[];
  sidebarOpen: boolean;
  isLoadingBookmarks: boolean;
  isSettingsLoaded: boolean;
};

export type BookmarkSliceAction = {
  getSetting: () => Promise<void>;
  setSetting: (newSetting: Partial<Setting>) => Promise<void>;
  loadBookmarkTree: () => Promise<void>;
  loadFetchConfig: () => Promise<void>;
  loadMatchState: () => Promise<void>;
  updateCoverExistsMap: (newMap: Record<string, boolean>) => void;
  setSelectedFolderId: (id: string) => void;
  setSelectedConfigGroupId: (id: string) => void;
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
  bookmarksByHost: {},
  matchedBookmarks: [],
  matchedBookmarkIds: [],
  bookmarkToConfigsMap: {},
  coverExistsMap: {},
  fetchConfigList: [],
  selectedFolderId: "all",
  selectedConfigGroupId: "all",
  expandedFolderIds: [],
  sidebarOpen: true,
  isLoadingBookmarks: false,
  isSettingsLoaded: false,

  getSetting: async () => {
    const result = await browser.storage.local.get(SETTINGS_KEY);
    const storedSetting: Setting | undefined = result[SETTINGS_KEY] as Setting | undefined;
    if (storedSetting) {
      set({
        setting: storedSetting,
        sidebarOpen: storedSetting.sidebarOpen ?? true,
        selectedFolderId: storedSetting.selectedFolderId ?? "all",
        selectedConfigGroupId: storedSetting.selectedConfigGroupId ?? "all",
        expandedFolderIds: storedSetting.expandedFolderIds ?? [],
        isSettingsLoaded: true,
      });
    } else {
      set({ isSettingsLoaded: true });
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
    // Build hostname index cache once to avoid repeated URL parsing in matchBookmarks
    const byHost: BookmarksByHost = {};
    for (const bk of list) {
      if (!bk.url) continue;
      try {
        const host = new URL(bk.url).hostname;
        if (!byHost[host]) byHost[host] = [];
        byHost[host].push(bk);
      } catch (_) { }
    }
    set({ bookmarkTree: tree, bookmarkMap: map, bookmarkList: list, bookmarksByHost: byHost });
  },

  loadFetchConfig: async () => {
    const raw = await browser.storage.local.get(CONFIGS_KEY);
    const fetchConfigList: FetchConfig[] = (raw[CONFIGS_KEY] as FetchConfig[]) || [];
    set({ fetchConfigList });
  },

  loadMatchState: async () => {
    try {
      const raw = await browser.storage.local.get(MATCH_STATE_KEY);
      const matchState = raw[MATCH_STATE_KEY] as MatchState | undefined;
      if (!matchState) return;

      const { matchedBookmarkIds = [], bookmarkToConfigsMap = {}, coverExistsMap = {} } = matchState;
      const bookmarkMap = get().bookmarkMap;
      const matchedBookmarks: BookmarkTreeNode[] = [];
      
      for (const id of matchedBookmarkIds) {
        if (bookmarkMap[id]) {
          matchedBookmarks.push(bookmarkMap[id]);
        }
      }

      set({
        matchedBookmarkIds,
        matchedBookmarks,
        bookmarkToConfigsMap,
        coverExistsMap,
      });
    } catch (e) {
      console.error("Error in loadMatchState:", e);
    }
  },

  updateCoverExistsMap: (newMap) => {
    set((state) => ({ coverExistsMap: { ...state.coverExistsMap, ...newMap } }));
  },

  setSelectedFolderId: (id: string) => {
    set({ selectedFolderId: id });
    get().setSetting({ selectedFolderId: id });
  },

  setSelectedConfigGroupId: (id: string) => {
    set({ selectedConfigGroupId: id });
    get().setSetting({ selectedConfigGroupId: id });
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
