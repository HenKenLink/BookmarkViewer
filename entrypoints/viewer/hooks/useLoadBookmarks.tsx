import { useEffect } from "react";
import { useStore } from "../store";

export const useLoadBookmarks = () => {
  const loadBookmarkTree = useStore((state) => state.loadBookmarkTree);
  const loadFetchConfig = useStore((state) => state.loadFetchConfig);
  const matchBookmarks = useStore((state) => state.matchBookmarks);
  const setLoadingBookmarks = useStore((state) => state.setLoadingBookmarks);

  useEffect(() => {
    const initialize = async () => {
      const hasItems = useStore.getState().matchedBookmarks.length > 0;
      if (!hasItems) {
        setLoadingBookmarks(true);
      }
      try {
        // Parallelize: load bookmark tree, fetch config, and settings concurrently
        await Promise.all([loadBookmarkTree(), loadFetchConfig()]);
        await matchBookmarks();
      } finally {
        setLoadingBookmarks(false);
      }
    };

    initialize();

    // Reload and re-match when user changes bookmarks
    const reloadTree = async () => {
      await loadBookmarkTree();
      await matchBookmarks();
    };

    browser.bookmarks.onCreated.addListener(reloadTree);
    browser.bookmarks.onChanged.addListener(reloadTree);
    browser.bookmarks.onRemoved.addListener(reloadTree);
    browser.bookmarks.onMoved.addListener(reloadTree);

    return () => {
      browser.bookmarks.onCreated.removeListener(reloadTree);
      browser.bookmarks.onChanged.removeListener(reloadTree);
      browser.bookmarks.onRemoved.removeListener(reloadTree);
      browser.bookmarks.onMoved.removeListener(reloadTree);
    };
  }, []);
};
