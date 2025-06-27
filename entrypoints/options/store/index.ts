import { create, StateCreator } from "zustand";
import { BookmarkTreeNode, MatchedUrl } from "../../global/types";
// import { get } from "http";
import {
  filterBookmarkByHostname,
  getBookmarksUrl,
} from "../../global/utils/index";

type BookmarkMap = Record<string, BookmarkTreeNode>;

type storeState = {
  // urlList: string[];
  bookmarkTree: BookmarkTreeNode | null;
  bookmarkList: BookmarkTreeNode[];
  bookmarkMap: BookmarkMap;
  // matchedBookmarkList: BookmarkTreeNode[];
  matchedUrlList: MatchedUrl[];
};

type storeAction = {
  // setTabId: (newId: number | null) => void;
  loadBookmarkTree: () => Promise<void>;
  matchBookmarks: (hostnameList: string[]) => MatchedUrl[];
};

type Store = storeState & storeAction;

export const loadBookmarkTreeAction: StateCreator<
  Store,
  [],
  [],
  storeAction
> = (set, get) => ({
  loadBookmarkTree: async () => {
    const tree = (await browser.bookmarks.getTree())[0];
    const map: BookmarkMap = {};
    const list: BookmarkTreeNode[] = [];
    if (tree) {
      const iterate = (node: BookmarkTreeNode) => {
        if (node) {
          map[node.id] = node;
          list.push(node);

          if (node.children) {
            node.children.forEach(iterate);
          }
        }
      };
      iterate(tree);
    }
    set(() => ({
      bookmarkTree: tree,
      bookmarkMap: map,
      bookmarkList: list,
    }));
  },
  matchBookmarks: (hostnameList: string[]) => {
    const matchedUrlList: MatchedUrl[] = [];
    const bookmarkList = get().bookmarkList;
    if (!bookmarkList) {
      throw new Error("BookmarkList is empty.");
    }
    console.log("MatchBookmarks get bookmarkList result: ", bookmarkList);
    hostnameList.forEach((hostname) => {
      const matchedBookmarkList = filterBookmarkByHostname(
        bookmarkList,
        hostname
      );
      const pageUrlList = getBookmarksUrl(matchedBookmarkList);
      const matchedUrl: MatchedUrl = {
        hostname: hostname,
        pageUrlList: pageUrlList,
      };
      matchedUrlList.push(matchedUrl);
    });

    const res = {
      matchedUrlList: matchedUrlList,
    };
    set(() => res);
    return matchedUrlList;
  },
});

export const useStore = create<Store>()((...action) => ({
  bookmarkTree: null as BookmarkTreeNode | null,
  bookmarkList: [] as BookmarkTreeNode[],
  bookmarkMap: {} as BookmarkMap,
  // matchedBookmarkList: [] as BookmarkTreeNode[],
  matchedUrlList: [] as MatchedUrl[],
  ...loadBookmarkTreeAction(...action),
}));
