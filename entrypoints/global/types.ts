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

export type FetchMode = "inject" | "simple";
export type SelectorType = "regex" | "css" | "xpath";

// 按配置分组的获取任务
export type FetchTask = {
  config: FetchConfig;
  items: BookmarkFetchItem[];
};

export type FetchConfig = {
  id: number;
  name: string;
  hostname: string;
  regexPattern?: string;
  fetchScript?: string;
  mode: FetchMode;
  selector?: string;
  selectorType?: SelectorType;
  attribute?: string;
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
  fetchDelayCount: number;
  fetchDelayTimeMin: number;
  fetchDelayTimeMax: number;
  enableDelay: boolean;
};
