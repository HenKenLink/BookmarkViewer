import { create, StateCreator } from "zustand";
import {
  Setting,
  BookmarkTreeNode,
  FetchConfig,
  FetchTask,
  BookmarkFetchItem,
  LoadedImageMap,
} from "../../global/types";
import { getAllBookmarksInFolder, createFetchTasksForBookmarks } from "../utils/folderUtils";
import { downloadThumbnailAsFile, uploadThumbnailFile, downloadMultipleThumbnails } from "../utils/thumbnailUtils";
import { messageId } from "../../global/message";
import { SETTINGS_KEY, CONFIGS_KEY } from "../../global/consts";
import { BookmarkSlice, createBookmarkSlice } from "../../global/store/bookmarkSlice";

type ViewerStoreState = {
  fetchTaskList: FetchTask[];
  isFetching: boolean;
  fetchProgress: number;
  fetchTotal: number;
  selectedBookmarkIds: string[];
  isSelectionMode: boolean;
};

type ViewerStoreAction = {
  clearLoadedImageMap: () => void;
  setFetchStatus: (isFetching: boolean, total?: number) => void;
  updateFetchProgress: (progress: number) => void;
  loadSingleThumb: (pageUrl: string) => Promise<void>;
  stopFetching: () => void;
  setSelectedBookmarkIds: (ids: string[]) => void;
  toggleBookmarkSelection: (id: string) => void;
  clearSelection: () => void;
  setIsSelectionMode: (mode: boolean) => void;
  getAllBookmarksInFolderAction: (folderId: string) => BookmarkTreeNode[];
  forceFetchThumbnails: (bookmarkIds: string[]) => Promise<void>;
  downloadThumbnail: (bookmarkId: string) => Promise<void>;
  uploadThumbnail: (bookmarkId: string, file: File) => Promise<void>;
  downloadMultipleThumbnailsAction: (bookmarkIds: string[]) => Promise<void>;
  clearAllCovers: () => Promise<void>;
  toggleFavoriteFolder: (id: string) => void;
  setFavoriteFolderAlias: (id: string, alias: string) => void;
  delFetchConfig: (delIdList: number[]) => Promise<void>;
  importConfigList: (newConfigList: FetchConfig[]) => Promise<void>;
  setFetchConfig: (newConfig: FetchConfig, isUpdate: boolean) => Promise<void>;
};

type Store = BookmarkSlice & ViewerStoreState & ViewerStoreAction;

export const actionSlice: StateCreator<Store, [], [], ViewerStoreAction> = (
  set,
  get
) => ({
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
  // Multi-selection actions
  setSelectedBookmarkIds: (ids: string[]) => {
    set(() => ({ selectedBookmarkIds: ids }));
  },
  toggleBookmarkSelection: (id: string) => {
    const current = get().selectedBookmarkIds;
    if (current.includes(id)) {
      set(() => ({ selectedBookmarkIds: current.filter(i => i !== id) }));
    } else {
      set(() => ({ selectedBookmarkIds: [...current, id] }));
    }
  },
  clearSelection: () => {
    set(() => ({ selectedBookmarkIds: [], isSelectionMode: false }));
  },
  setIsSelectionMode: (mode: boolean) => {
    set(() => ({ isSelectionMode: mode }));
    if (!mode) {
      set(() => ({ selectedBookmarkIds: [] }));
    }
  },
  // Context menu actions
  getAllBookmarksInFolderAction: (folderId: string) => {
    const folder = get().bookmarkMap[folderId];
    if (!folder) return [];
    return getAllBookmarksInFolder(folder, get().bookmarkMap);
  },
  forceFetchThumbnails: async (bookmarkIds: string[]) => {
    const bookmarkMap = get().bookmarkMap;
    const fetchConfigList = get().fetchConfigList;

    const bookmarks = bookmarkIds
      .map(id => bookmarkMap[id])
      .filter(bk => bk && bk.url);

    if (bookmarks.length === 0) return;

    const fetchTasks = createFetchTasksForBookmarks(bookmarks, fetchConfigList);

    if (fetchTasks.length > 0) {
      await browser.runtime.sendMessage({
        type: messageId.getThumb,
        fetchTaskList: fetchTasks,
        force: true,
      });
    }
  },
  downloadThumbnail: async (bookmarkId: string) => {
    const blobUrl = get().loadedImageMap[bookmarkId];
    if (!blobUrl) {
      throw new Error('No thumbnail available for this bookmark');
    }

    const bookmark = get().bookmarkMap[bookmarkId];
    const filename = `${bookmark.title || 'bookmark'}_thumb.jpg`;

    await downloadThumbnailAsFile(blobUrl, filename);
  },
  uploadThumbnail: async (bookmarkId: string, file: File) => {
    const bookmark = get().bookmarkMap[bookmarkId];
    if (!bookmark || !bookmark.url) {
      throw new Error('Invalid bookmark');
    }

    const blobUrl = await uploadThumbnailFile(file, bookmark.url);

    // Update the loaded image map
    get().updateLoadedImageMap({ [bookmarkId]: blobUrl });
  },
  downloadMultipleThumbnailsAction: async (bookmarkIds: string[]) => {
    const loadedImageMap = get().loadedImageMap;
    const bookmarkMap = get().bookmarkMap;

    const thumbnails = bookmarkIds
      .filter(id => loadedImageMap[id])
      .map(id => ({
        blobUrl: loadedImageMap[id],
        filename: `${bookmarkMap[id]?.title || 'bookmark'}_thumb.jpg`,
      }));

    if (thumbnails.length === 0) {
      throw new Error('No thumbnails available for selected bookmarks');
    }

    await downloadMultipleThumbnails(thumbnails);
  },
  clearAllCovers: async () => {
    const all = await browser.storage.local.get(null);
    const keys = Object.keys(all);

    const keysToRemove = keys.filter(key => key !== SETTINGS_KEY && key !== CONFIGS_KEY);

    if (keysToRemove.length > 0) {
      await browser.storage.local.remove(keysToRemove);
    }

    get().clearLoadedImageMap();
  },
  toggleFavoriteFolder: (id: string) => {
    const currentFavorites = get().setting.favoriteFolderIds || [];
    const isFavorite = currentFavorites.includes(id);
    let newFavorites;

    if (isFavorite) {
      newFavorites = currentFavorites.filter(folderId => folderId !== id);
    } else {
      newFavorites = [...currentFavorites, id];
    }

    get().setSetting({ favoriteFolderIds: newFavorites });
  },
  setFavoriteFolderAlias: (id: string, alias: string) => {
    const currentAliases = get().setting.favoriteFolderAliases || {};
    get().setSetting({
      favoriteFolderAliases: {
        ...currentAliases,
        [id]: alias,
      }
    });
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
  setFetchConfig: async (newConfig, isUpdate) => {
    let newConfigList: FetchConfig[] = [];
    const configList = get().fetchConfigList || [];
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
});

export const useStore = create<Store>()((...a) => ({
  ...createBookmarkSlice(...a),
  fetchTaskList: [],
  isFetching: false,
  fetchProgress: 0,
  fetchTotal: 0,
  selectedBookmarkIds: [],
  isSelectionMode: false,
  ...actionSlice(...a),
}));
