import { StateCreator } from "zustand";
import {
  Setting,
  BookmarkTreeNode,
  FetchConfig,
  LoadedImageMap,
  FetchTask,
  BookmarkFetchItem,
} from "../types";
import { SETTINGS_KEY, CONFIGS_KEY } from "../consts";

export type BookmarkMap = Record<string, BookmarkTreeNode>;
export type BookmarksByHost = Record<string, BookmarkTreeNode[]>;

export type BookmarkSliceState = {
  setting: Setting;
  bookmarkTree: BookmarkTreeNode | null;
  bookmarkList: BookmarkTreeNode[];
  bookmarkMap: BookmarkMap;
  bookmarksByHost: BookmarksByHost;
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
  loadSingleThumb: (pageUrl: string) => Promise<void>;
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
  bookmarksByHost: {},
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
    // Build hostname index cache once to avoid repeated URL parsing in matchBookmarks
    const byHost: BookmarksByHost = {};
    for (const bk of list) {
      if (!bk.url) continue;
      try {
        const host = new URL(bk.url).hostname;
        if (!byHost[host]) byHost[host] = [];
        byHost[host].push(bk);
      } catch (_) {}
    }
    set({ bookmarkTree: tree, bookmarkMap: map, bookmarkList: list, bookmarksByHost: byHost });
  },

  loadFetchConfig: async () => {
    const raw = await browser.storage.local.get(CONFIGS_KEY);
    const fetchConfigList: FetchConfig[] = (raw[CONFIGS_KEY] as FetchConfig[]) || [];
    set({ fetchConfigList });
  },

  matchBookmarks: async () => {
    const configList = get().fetchConfigList;
    const bookmarkList = get().bookmarkList;
    if (!bookmarkList || bookmarkList.length === 0) {
      return { matchedBookmarks: [], fetchTaskList: [] };
    }

    // Group configs by hostname
    const configsByHost: Record<string, FetchConfig[]> = {};
    for (const config of configList) {
      let host = config.hostname;
      if (host.includes("://")) {
        try { host = new URL(host).hostname; } catch (_) {}
      }
      if (!configsByHost[host]) configsByHost[host] = [];
      configsByHost[host].push(config);
    }

    // Use cached hostname index (built once in loadBookmarkTree, not rebuilt every call)
    const bookmarksByHost = get().bookmarksByHost;

    // Collect all URLs that need storage lookup (across all configs) in one pass
    const loadedImageMap = get().loadedImageMap;
    const urlsToFetch = new Set<string>();
    for (const host in configsByHost) {
      const bksAtHost = bookmarksByHost[host];
      if (!bksAtHost) continue;
      for (const bk of bksAtHost) {
        if (bk.url && !loadedImageMap[bk.id]) {
          urlsToFetch.add(bk.url);
        }
      }
    }

    // Single batched storage read for all URLs at once
    let storageData: Record<string, any> = {};
    if (urlsToFetch.size > 0) {
      try {
        storageData = await browser.storage.local.get(Array.from(urlsToFetch));
      } catch (e) {
        console.error("Error batch fetching from storage:", e);
      }
    }

    // Build work items for all (host, config) pairs
    const allMatchedBookmarks: BookmarkTreeNode[] = [];
    const fetchTaskList: FetchTask[] = [];
    // Collect (bookmarkId -> url) pairs that have storage data but no blob URL yet
    const pendingBlobEntries: Array<{ bookmarkId: string; url: string }> = [];

    for (const host in configsByHost) {
      const bksAtHost = bookmarksByHost[host];
      if (!bksAtHost) continue;

      for (const config of configsByHost[host]) {
        const regex = config.regexPattern ? new RegExp(config.regexPattern) : null;
        const matchedAtHost = regex
          ? bksAtHost.filter(bk => regex.test(bk.url!))
          : bksAtHost;

        if (matchedAtHost.length === 0) continue;

        allMatchedBookmarks.push(...matchedAtHost);

        const unloadedItems: BookmarkFetchItem[] = [];
        for (const bk of matchedAtHost) {
          const purl = bk.url;
          if (!purl) continue;
          if (loadedImageMap[bk.id]) continue; // already loaded
          const raw = storageData[purl];
          if (raw && ((Array.isArray(raw) && raw.length > 0) || (typeof raw === "string" && raw.startsWith("data:")))) {
            // Defer blob URL creation to idle time
            pendingBlobEntries.push({ bookmarkId: bk.id, url: purl });
          } else {
            unloadedItems.push({ bookmarkId: bk.id, pageUrl: purl, configId: config.id, isLoaded: false });
          }
        }

        if (unloadedItems.length > 0) {
          fetchTaskList.push({ config, items: unloadedItems });
        }
      }
    }

    // Schedule blob URL creation during browser idle time to avoid blocking the main thread
    if (pendingBlobEntries.length > 0) {
      const CHUNK_SIZE = 20;
      const urlToBlobUrl: Record<string, string> = {};

      const processChunk = (startIdx: number) => {
        const chunk = pendingBlobEntries.slice(startIdx, startIdx + CHUNK_SIZE);
        const newMap: LoadedImageMap = {};

        for (const { bookmarkId, url } of chunk) {
          if (!urlToBlobUrl[url]) {
            const raw = storageData[url];
            if (Array.isArray(raw)) {
              const buf = new Uint8Array(raw);
              const blob = new Blob([buf.buffer], { type: "image/jpeg" });
              urlToBlobUrl[url] = URL.createObjectURL(blob);
            } else if (typeof raw === "string" && raw.startsWith("data:")) {
              urlToBlobUrl[url] = raw;
            }
          }
          if (urlToBlobUrl[url]) {
            newMap[bookmarkId] = urlToBlobUrl[url];
          }
        }

        get().updateLoadedImageMap(newMap);

        const nextIdx = startIdx + CHUNK_SIZE;
        if (nextIdx < pendingBlobEntries.length) {
          if (typeof requestIdleCallback !== "undefined") {
            requestIdleCallback(() => processChunk(nextIdx), { timeout: 2000 });
          } else {
            setTimeout(() => processChunk(nextIdx), 0);
          }
        }
      };

      if (typeof requestIdleCallback !== "undefined") {
        requestIdleCallback(() => processChunk(0), { timeout: 2000 });
      } else {
        setTimeout(() => processChunk(0), 0);
      }
    }

    // Only update state if matchedBookmarks actually changed
    const currentMatched = get().matchedBookmarks;
    const isSameMatched = currentMatched.length === allMatchedBookmarks.length &&
      currentMatched.every((bk, idx) => bk.id === allMatchedBookmarks[idx].id);

    const res = { matchedBookmarks: allMatchedBookmarks, fetchTaskList };
    if (!isSameMatched) {
      set(res as any);
    } else {
      // Always update fetchTaskList even if matched set is unchanged
      set({ fetchTaskList } as any);
    }

    return res;
  },

  loadSingleThumb: async (pageUrl) => {
    try {
      const storageData = await browser.storage.local.get(pageUrl);
      const raw = storageData[pageUrl] as any;

      let blobUrl = "";
      if (raw && Array.isArray(raw) && raw.length > 0) {
        const buf = new Uint8Array(raw);
        const blob = new Blob([buf.buffer], { type: "image/jpeg" });
        blobUrl = URL.createObjectURL(blob);
      } else if (typeof raw === "string" && raw.startsWith("data:")) {
        blobUrl = raw;
      }
      if (blobUrl) {

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
