import { useEffect } from "react";
import { useStore } from "../store";

export const useLoadBookmarks = () => {
  const bookmarkTree = useStore((state) => state.bookmarkTree);
  const loadBookmarkTree = useStore((state) => state.loadBookmarkTree);

  useEffect(() => {
    const loadTree = () => {
      loadBookmarkTree();
    };
    // initialize bookmarkTree
    loadTree();

    // reloads bookmarkTree when user changes any bookmarks
    browser.bookmarks.onCreated.addListener(loadTree);
    browser.bookmarks.onChanged.addListener(loadTree);
    browser.bookmarks.onRemoved.addListener(loadTree);
    browser.bookmarks.onMoved.addListener(loadTree);

    return () => {
      browser.bookmarks.onCreated.removeListener(loadTree);
      browser.bookmarks.onChanged.removeListener(loadTree);
      browser.bookmarks.onRemoved.removeListener(loadTree);
      browser.bookmarks.onMoved.removeListener(loadTree);
    };
  }, []);

  // useEffect(() => {
  //   if (bookmarkTree) {
  //     // 随bookmarkTree更新状态
  //   }
  // }, [bookmarkTree]);
};
