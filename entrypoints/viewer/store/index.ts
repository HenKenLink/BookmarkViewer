import { create, StateCreator } from "zustand";
import {
  Setting,
  BookmarkTreeNode,
  FetchConfig,
  FetchTask,
  BookmarkFetchItem,
  MatchState,
} from "../../global/types";
import { getAllBookmarksInFolder, createFetchTasksForBookmarks } from "../utils/folderUtils";
import { downloadThumbnailAsFile, uploadThumbnailFile, downloadMultipleThumbnails } from "../utils/thumbnailUtils";
import { messageId } from "../../global/message";
import { SETTINGS_KEY, CONFIGS_KEY, MATCH_STATE_KEY } from "../../global/consts";
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
  setFetchStatus: (isFetching: boolean, total?: number) => void;
  updateFetchProgress: (progress: number) => void;
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
  setFetchStatus: (isFetching, total) => {
    set((state) => ({
      isFetching,
      ...(total !== undefined ? { fetchTotal: total, fetchProgress: 0 } : {}),
    }));
  },
  updateFetchProgress: (progress) => {
    set(() => ({ fetchProgress: progress }));
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
    const bookmark = get().bookmarkMap[bookmarkId];
    if (!bookmark || !bookmark.url) {
      throw new Error('Invalid bookmark');
    }
    const storageData = await browser.storage.local.get(bookmark.url);
    const raw = storageData[bookmark.url];
    if (!raw) throw new Error('No thumbnail available for this bookmark');
    
    let blobUrl = "";
    if (Array.isArray(raw)) {
      blobUrl = URL.createObjectURL(new Blob([new Uint8Array(raw)], { type: "image/jpeg" }));
    } else if (typeof raw === "string" && raw.startsWith("data:")) {
      blobUrl = raw;
    }
    if (!blobUrl) throw new Error('Invalid thumbnail data');

    const filename = `${bookmark.title || 'bookmark'}_thumb.jpg`;
    await downloadThumbnailAsFile(blobUrl, filename);
    if (blobUrl.startsWith("blob:")) URL.revokeObjectURL(blobUrl);
  },
  uploadThumbnail: async (bookmarkId: string, file: File) => {
    const bookmark = get().bookmarkMap[bookmarkId];
    if (!bookmark || !bookmark.url) {
      throw new Error('Invalid bookmark');
    }

    await uploadThumbnailFile(file, bookmark.url);
    get().updateCoverExistsMap({ [bookmark.url]: true });
  },
  downloadMultipleThumbnailsAction: async (bookmarkIds: string[]) => {
    const bookmarkMap = get().bookmarkMap;
    const coverExistsMap = get().coverExistsMap;

    const bookmarks = bookmarkIds
      .filter(id => {
         const bk = bookmarkMap[id];
         return bk && bk.url && coverExistsMap[bk.url];
      })
      .map(id => bookmarkMap[id]);

    if (bookmarks.length === 0) {
      throw new Error('No thumbnails available for selected bookmarks');
    }
    
    const urlsToFetch = bookmarks.map(bk => bk.url!);
    const storageData = await browser.storage.local.get(urlsToFetch);
    const thumbnails = [];
    
    for (const bk of bookmarks) {
      const raw = storageData[bk.url!];
      if (raw) {
         let blobUrl = "";
         if (Array.isArray(raw)) blobUrl = URL.createObjectURL(new Blob([new Uint8Array(raw)], { type: "image/jpeg" }));
         else if (typeof raw === "string" && raw.startsWith("data:")) blobUrl = raw;
         if (blobUrl) {
           thumbnails.push({
             blobUrl,
             filename: `${bk.title || 'bookmark'}_thumb.jpg`,
           });
         }
      }
    }

    if (thumbnails.length === 0) {
      throw new Error('No thumbnails available for selected bookmarks');
    }

    await downloadMultipleThumbnails(thumbnails);
    thumbnails.forEach(t => { if (t.blobUrl.startsWith("blob:")) URL.revokeObjectURL(t.blobUrl); });
  },
  clearAllCovers: async () => {
    const all = await browser.storage.local.get(null);
    const keys = Object.keys(all);

    const keysToRemove = keys.filter(key => key !== SETTINGS_KEY && key !== CONFIGS_KEY && key !== MATCH_STATE_KEY);

    if (keysToRemove.length > 0) {
      await browser.storage.local.remove(keysToRemove);
    }

    const matchStateRaw = await browser.storage.local.get(MATCH_STATE_KEY);
    const matchState = matchStateRaw[MATCH_STATE_KEY] as MatchState | undefined;
    if (matchState) {
      matchState.coverExistsMap = {};
      await browser.storage.local.set({ [MATCH_STATE_KEY]: matchState });
    }
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
    
    // Cascade delete config IDs from groups
    const currentGroups = get().setting.configGroups || [];
    const updatedGroups = currentGroups.map(group => ({
      ...group,
      configIds: group.configIds.filter(id => !delIdList.includes(id))
    }));
    if (JSON.stringify(currentGroups) !== JSON.stringify(updatedGroups)) {
      await get().setSetting({ configGroups: updatedGroups });
    }

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
