export type BookmarkTreeNode = Browser.bookmarks.BookmarkTreeNode;

// Key: bookmarkId, Value: blobUrl
export type LoadedImageMap = Record<string, string>;

export type LoadedImage = {
  bookmarkId: string;
  pageUrl: string;
  blobUrl: string;
};

// 每个待获取封面的书签项
export type BookmarkFetchItem = {
  bookmarkId: string;
  pageUrl: string;
  configId: number;
  isLoaded: boolean;
};
export type FetchMode = "fast" | "page";
export type SelectorType = "regex" | "css" | "xpath";
export type LogLevel = "debug" | "info" | "warn" | "error" | "none";

// 按配置分组的获取任务
export type FetchTask = {
  config: FetchConfig;
  items: BookmarkFetchItem[];
};

export type ResultType = "cover_url" | "video_url";

export type FetchConfig = {
  id: number;
  name: string;
  hostname: string;
  regexPattern?: string;
  mode: FetchMode;
  selector?: string;
  selectorType?: SelectorType;
  attribute?: string;
  resultType?: ResultType;
};

export type NavItem = {
  name: string;
  path: string;
};

export type Setting = {
  darkMode: boolean;
  enableAnimations: boolean;
  sidebarOpen: boolean;
  selectedFolderId: string;
  expandedFolderIds: string[];
  pageModeConcurrency: number;
  fastModeConcurrency: number;
  fetchDelayCount: number;
  fetchDelayTimeMin: number;
  fetchDelayTimeMax: number;
  enableDelay: boolean;
  logLevel: LogLevel;
  favoriteFolderIds: string[];
  showFavoriteFolders: boolean;
  favoriteFolderAliases: Record<string, string>;
  keepTabsOpen: boolean;
  videoFetchChunkSize: number;
  videoFetchMaxRetries: number;
  showActiveTabBanner: boolean;
  autoFetchOnBookmark: boolean;
  sortBy: "name" | "dateAdded";
  sortOrder: "asc" | "desc";
  foldersPosition: "top" | "bottom" | "mixed";
  urlFilters: string[];
  clickAction: "popup" | "options";
};
