export type BookmarkTreeNode = Browser.bookmarks.BookmarkTreeNode;

export type LoadedImage = { pageUrl: string; blobUrl: string };
export type PageUrl = { url: string; isLoaded: boolean };

export type MatchedUrl = {
  hostname: string;
  pageUrlList: PageUrl[];
};
