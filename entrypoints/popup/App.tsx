import { useState, useEffect, useMemo, useRef } from "react";
import {
  Box,
  CssBaseline,
  Typography,
  TextField,
  InputAdornment,
  IconButton,
  CircularProgress,
  Divider,
  Stack,
  Tooltip,
} from "@mui/material";
import { ThemeProvider, alpha } from "@mui/material/styles";
import { lightTheme, darkTheme } from "../global/theme";
import SearchIcon from "@mui/icons-material/Search";
import ClearIcon from "@mui/icons-material/Clear";
import MenuIcon from "@mui/icons-material/Menu";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import SettingsIcon from "@mui/icons-material/Settings";

import { SharedFolderTree } from "@/entrypoints/global/components/SharedFolderTree";
import { PopupBookmarkCard } from "./Components/PopupBookmarkCard";
import { usePopupStore } from "./store";
import { BookmarkTreeNode, FetchConfig } from "@/entrypoints/global/types";
import { messageId } from "@/entrypoints/global/message";
import { SortControls } from "@/entrypoints/global/components/SortControls";
import { UrlFilterControls } from "@/entrypoints/global/components/UrlFilterControls";
import { FavoriteFoldersBar } from "@/entrypoints/global/components/FavoriteFoldersBar";
import { useDisplayBookmarks } from "../global/hooks/useDisplayBookmarks";


const SIDEBAR_WIDTH = 200;

function PopupApp() {
  const getSetting = usePopupStore((s) => s.getSetting);
  const loadBookmarkTree = usePopupStore((s) => s.loadBookmarkTree);
  const loadFetchConfig = usePopupStore((s) => s.loadFetchConfig);
  const matchBookmarks = usePopupStore((s) => s.matchBookmarks);
  const setting = usePopupStore((s) => s.setting);
  const matchedBookmarks = usePopupStore((s) => s.matchedBookmarks);
  const bookmarkList = usePopupStore((s) => s.bookmarkList);
  const fetchConfigList = usePopupStore((s) => s.fetchConfigList);
  const selectedFolderId = usePopupStore((s) => s.selectedFolderId);
  const setSelectedFolderId = usePopupStore((s) => s.setSelectedFolderId);
  const bookmarkMap = usePopupStore((s) => s.bookmarkMap);
  const bookmarkTree = usePopupStore((s) => s.bookmarkTree);
  const expandedFolderIds = usePopupStore((s) => s.expandedFolderIds);
  const setExpandedFolderIds = usePopupStore((s) => s.setExpandedFolderIds);
  const isLoadingBookmarks = usePopupStore((s) => s.isLoadingBookmarks);
  const setLoadingBookmarks = usePopupStore((s) => s.setLoadingBookmarks);
  const sidebarOpen = usePopupStore((s) => s.sidebarOpen);
  const setSidebarOpen = usePopupStore((s) => s.setSidebarOpen);
  const updateLoadedImageMap = usePopupStore((s) => s.updateLoadedImageMap);
  const loadSingleThumb = usePopupStore((s) => s.loadSingleThumb);
  const setSetting = usePopupStore((s) => s.setSetting);

  const [searchQuery, setSearchQuery] = useState("");
  const [renderedLimit, setRenderedLimit] = useState(25);
  const [mode, setMode] = useState<"light" | "dark">("light");
  const theme = mode === "light" ? lightTheme : darkTheme;

  // Identify folders that contain matched bookmarks in their subtree
  const { displayItems } = useDisplayBookmarks(
    bookmarkTree,
    matchedBookmarks,
    bookmarkMap,
    selectedFolderId,
    searchQuery,
    setting
  );

  const displayBookmarks = useMemo(() => 
    displayItems
      .filter(item => item.type === 'bookmark')
      .map(item => item.data),
    [displayItems]
  );

  // Reset limit when folder or search changes
  useEffect(() => {
    setRenderedLimit(25);
  }, [selectedFolderId, searchQuery]);

  const loadMoreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && renderedLimit < displayBookmarks.length) {
          setRenderedLimit((prev) => prev + 25);
        }
      },
      { threshold: 0.1, rootMargin: "200px" }
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => observer.disconnect();
  }, [displayBookmarks.length, renderedLimit]);

  const [activeTabStatus, setActiveTabStatus] = useState<{
    url: string;
    matches: boolean;
    config?: FetchConfig;
    hasCover?: boolean;
    isFetching?: boolean;
  } | null>(null);

  useEffect(() => {
    const init = async () => {
      setLoadingBookmarks(true);
      try {
        // Parallelize initialization for faster popup opening
        await Promise.all([getSetting(), loadBookmarkTree(), loadFetchConfig()]);
        await matchBookmarks();
      } finally {
        setLoadingBookmarks(false);
      }
    };
    init();
  }, []);

  // Reload and re-match when user changes bookmarks (keep consistent with Viewer)
  useEffect(() => {
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
  }, [loadBookmarkTree, matchBookmarks]);

  useEffect(() => {
    setMode(setting.darkMode ? "dark" : "light");
  }, [setting]);

  // Real-time message listener
  useEffect(() => {
    const listener = (message: any) => {
      if (message.type === messageId.singleThumbFinished) {
        // Reload image for this page URL using shared logic
        loadSingleThumb(message.pageUrl);
        
        // Update active tab status if matches
        if (activeTabStatus?.url === message.pageUrl) {
          setActiveTabStatus(prev => prev ? { ...prev, hasCover: true, isFetching: false } : null);
        }
      }
    };
    browser.runtime.onMessage.addListener(listener);
    return () => browser.runtime.onMessage.removeListener(listener);
  }, [activeTabStatus, loadSingleThumb]);

  // Detect active tab and its status
  useEffect(() => {
    const checkActiveTab = async () => {
      const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
      if (!tab?.url) return;

      const url = tab.url;
      let matchedConfig: FetchConfig | undefined;
      
      const parsedUrl = new URL(url);
      const hostname = parsedUrl.hostname;

      for (const config of fetchConfigList) {
        let configHostname = config.hostname;
        if (configHostname.includes("://")) {
          try { configHostname = new URL(configHostname).hostname; } catch (_) {}
        }
        if (hostname === configHostname) {
          if (config.regexPattern) {
            const regex = new RegExp(config.regexPattern);
            if (!regex.test(url)) continue;
          }
          matchedConfig = config;
          break;
        }
      }

      if (matchedConfig) {
        const result = await browser.storage.local.get(url);
        const hasCover = result[url] && Array.isArray(result[url]) && result[url].length > 0;
        
        // Query background for active fetch status
        let isFetching = false;
        try {
          const res = await browser.runtime.sendMessage({ type: messageId.coverStatusQuery, url });
          if (res?.status === "fetching") isFetching = true;
        } catch (_) {}

        setActiveTabStatus({
          url,
          matches: true,
          config: matchedConfig,
          hasCover: !!hasCover,
          isFetching: isFetching,
        });
      } else {
        setActiveTabStatus({ url, matches: false });
      }
    };

    if (fetchConfigList.length > 0) {
      checkActiveTab();
    }
  }, [fetchConfigList]);

  const handleBack = () => {
    if (selectedFolderId === "all") return;
    const currentFolder = bookmarkMap[selectedFolderId];
    if (currentFolder && currentFolder.parentId && currentFolder.parentId !== "0") {
      setSelectedFolderId(currentFolder.parentId);
    } else {
      setSelectedFolderId("all");
    }
  };

  useEffect(() => {
    const handleMouseUp = (e: MouseEvent) => {
      if (e.button === 3) {
        e.preventDefault();
        handleBack();
      }
    };
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [selectedFolderId, bookmarkMap]);

  const openOptionsPage = async () => {
    const url = browser.runtime.getURL("/viewer.html");
    const tabs = await browser.tabs.query({ url });
    if (tabs.length > 0 && tabs[0].id) {
      await browser.tabs.update(tabs[0].id, { active: true });
    } else {
      await browser.tabs.create({ url });
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box
        sx={{
          display: "flex",
          width: "100%",
          height: "100%",
          overflow: "hidden",
          bgcolor: "background.default",
        }}
      >
        {/* Sidebar */}
        {sidebarOpen && (
          <Box
            sx={{
              width: SIDEBAR_WIDTH,
              minWidth: SIDEBAR_WIDTH,
              height: "100%",
              display: "flex",
              flexDirection: "column",
              borderRight: "1px solid",
              borderColor: "divider",
              bgcolor: (theme) =>
                theme.palette.mode === "light" ? "grey.50" : "#1a1a2e",
              overflow: "hidden",
              flexShrink: 0,
            }}
          >
            {/* Sidebar Header */}
            <Box
              sx={{
                background: (theme) =>
                  theme.palette.mode === "light"
                    ? `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`
                    : `linear-gradient(135deg, #1565c0 0%, #0d47a1 100%)`,
                px: 1.5,
                py: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexShrink: 0,
              }}
            >
              <Box>
                <Typography
                  variant="subtitle2"
                  sx={{ fontWeight: 700, color: "white", fontSize: "0.8rem" }}
                >
                  📁 Folders
                </Typography>
                <Typography
                  variant="caption"
                  sx={{ color: "rgba(255,255,255,0.75)", fontSize: "0.65rem" }}
                >
                  {matchedBookmarks.length} bookmarks
                </Typography>
              </Box>
              <IconButton
                size="small"
                onClick={() => setSidebarOpen(false)}
                sx={{ color: "rgba(255,255,255,0.8)", "&:hover": { color: "white" } }}
              >
                <ChevronLeftIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </Box>

            {/* Sidebar Tree */}
            <Box sx={{ flex: 1, overflowY: "auto", px: 1, py: 0.5 }}>
              <SharedFolderTree
                bookmarkTree={bookmarkTree}
                matchedBookmarks={matchedBookmarks}
                selectedFolderId={selectedFolderId}
                setSelectedFolderId={setSelectedFolderId}
                expandedFolderIds={expandedFolderIds}
                setExpandedFolderIds={setExpandedFolderIds}
                setting={setting}
                bookmarkMap={bookmarkMap}
              />
            </Box>
          </Box>
        )}

        {/* Main Content */}
        <Box
          sx={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            height: "100%",
            overflow: "hidden",
            minWidth: 0,
          }}
        >
          {/* Top Bar */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              px: 1.5,
              py: 0.75,
              borderBottom: "1px solid",
              borderColor: "divider",
              flexShrink: 0,
              bgcolor: "background.paper",
            }}
          >
            <IconButton size="small" onClick={() => setSidebarOpen(!sidebarOpen)}>
              <MenuIcon sx={{ fontSize: 18 }} />
            </IconButton>

            <TextField
              size="small"
              fullWidth
              variant="outlined"
              placeholder="Search bookmarks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon sx={{ fontSize: 16, color: "text.secondary" }} />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end" sx={{ gap: 0 }}>
                      {searchQuery && (
                        <IconButton size="small" onClick={() => setSearchQuery("")} edge={false}>
                          <ClearIcon sx={{ fontSize: 14 }} />
                        </IconButton>
                      )}
                      <UrlFilterControls
                        urlFilters={setting.urlFilters || []}
                        onChange={(filters) => setSetting({ urlFilters: filters })}
                        size="small"
                      />
                      <SortControls
                        sortBy={setting.sortBy || "dateAdded"}
                        sortOrder={setting.sortOrder || "desc"}
                        foldersPosition={setting.foldersPosition || "top"}
                        onChange={(updates) => setSetting(updates)}
                        size="small"
                      />
                    </InputAdornment>
                  ),
                  sx: { fontSize: "0.8rem", py: 0 },
                },
              }}
              sx={{
                "& .MuiOutlinedInput-root": {
                  borderRadius: 2,
                  height: 32,
                },
              }}
            />

            <Tooltip title="Open full viewer">
              <IconButton size="small" onClick={openOptionsPage} sx={{ flexShrink: 0 }}>
                <OpenInNewIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </Tooltip>
          </Box>

          {/* Folder breadcrumb / count row */}
          <Box
            sx={{
              px: 1.5,
              py: 0.5,
              display: "flex",
              alignItems: "center",
              borderBottom: "1px solid",
              borderColor: "divider",
              flexShrink: 0,
              bgcolor: "background.paper",
            }}
          >
            {selectedFolderId !== "all" && (
              <IconButton size="small" onClick={handleBack} sx={{ mr: 1, p: 0.5 }}>
                <ArrowBackIcon sx={{ fontSize: 16 }} />
              </IconButton>
            )}
            <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.7rem" }}>
              {selectedFolderId === "all" ? "All Bookmarks" : bookmarkMap[selectedFolderId]?.title || "Folder"} · {displayBookmarks.length} items
            </Typography>
          </Box>

          {/* Bookmark List */}
          <Box
            sx={{
              flex: 1,
              overflowY: "auto",
              pt: 0.5,
            }}
          >
            {setting.showFavoriteFolders && setting.favoriteFolderIds?.length > 0 && (
              <FavoriteFoldersBar
                favoriteFolderIds={setting.favoriteFolderIds}
                bookmarkMap={bookmarkMap}
                selectedFolderId={selectedFolderId}
                onSelect={setSelectedFolderId}
                aliases={setting.favoriteFolderAliases || {}}
                chipSize="small"
                sx={{ px: 1, mb: 1 }}
              />
            )}

            <Box sx={{ px: 1.5, pb: 1 }}>
              {isLoadingBookmarks && (
              <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", pt: 6 }}>
                <CircularProgress size={30} />
              </Box>
            )}

            {setting.showActiveTabBanner && activeTabStatus?.matches && (
              <Box sx={{ mb: 1.5, px: 1.5, py: 1, borderRadius: 2, bgcolor: (theme) => alpha(theme.palette.primary.main, 0.08), display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <Typography variant="caption" sx={{ fontWeight: 800, color: "primary.main", fontSize: "0.7rem", letterSpacing: "0.05em", textTransform: "uppercase" }}>
                  ✨ SITE MATCHED
                </Typography>
                <Box sx={{ px: 1, py: 0.2, borderRadius: 1.5, bgcolor: activeTabStatus.hasCover ? "success.main" : (activeTabStatus.isFetching ? "info.main" : "warning.main"), color: "white" }}>
                  <Typography variant="caption" sx={{ fontWeight: 800, fontSize: "0.6rem" }}>
                    {activeTabStatus.hasCover ? "SYNCED" : (activeTabStatus.isFetching ? "SYNCING..." : "NO COVER")}
                  </Typography>
                </Box>
              </Box>
            )}

            {!isLoadingBookmarks && displayBookmarks.length === 0 && (
              <Box sx={{ pt: 6, textAlign: "center", color: "text.secondary" }}>
                <Typography variant="body2" sx={{ fontSize: "0.8rem" }}>
                  No matching bookmarks found.
                </Typography>
                {fetchConfigList.length === 0 && (
                  <Typography variant="caption" sx={{ display: "block", mt: 1, fontSize: "0.72rem" }}>
                    Set up configs in the full viewer first.
                  </Typography>
                )}
              </Box>
            )}

            {!isLoadingBookmarks &&
              displayBookmarks.slice(0, renderedLimit).map((bk) => (
                <PopupBookmarkCard
                  key={bk.id}
                  bookmarkId={bk.id}
                  title={bk.title}
                  url={bk.url as string}
                />
              ))}

            {/* Sentinel for Infinite Scroll */}
            {!isLoadingBookmarks && renderedLimit < displayBookmarks.length && (
              <Box ref={loadMoreRef} sx={{ py: 2, display: "flex", justifyContent: "center" }}>
                <CircularProgress size={20} />
              </Box>
            )}
            </Box>
          </Box>
        </Box>
      </Box>
    </ThemeProvider>
  );
}

export default PopupApp;
