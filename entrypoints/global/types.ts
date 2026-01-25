export type BookmarkTreeNode = Browser.bookmarks.BookmarkTreeNode;

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
  fetchScript: string;
};

export type UnstoredUrl = {
  configId: number;
  hostname: string;
  pageUrlList: string[];
  fetchScript: string;
};

export type FetchConfig = {
  id: number;

  name: string;
  hostname: string;
  regexPattern?: string;
  fetchScript: string;
};

export type NavItem = {
  name: string;
  path: string;
};

export type Setting = {
  darkMode: Boolean;
};
