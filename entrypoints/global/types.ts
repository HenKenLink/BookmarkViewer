export type BookmarkTreeNode = Browser.bookmarks.BookmarkTreeNode;

// Key: bookmarkId, Value: blobUrl
export type LoadedImageMap = Record<string, string>;

export type LoadedImage = {
  bookmarkId: string;
  pageUrl: string;
  blobUrl: string;
};

export type PageUrl = { url: string; isLoaded: boolean };

export type MatchedUrl = {
  configId: number;
  hostname: string;
  pageUrlList: PageUrl[];
  fetchScript?: string;
  mode: FetchMode;
  selector?: string;
  selectorType?: SelectorType;
  attribute?: string;
};

export type FetchMode = "inject" | "simple";
export type SelectorType = "regex" | "css" | "xpath";

export type UnstoredUrl = {
  configId: number;
  hostname: string;
  pageUrlList: string[];
  fetchScript?: string;
  mode?: FetchMode;
  selector?: string;
  selectorType?: SelectorType;
  attribute?: string;
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
  darkMode: Boolean;
  enableAnimations: boolean;
};
