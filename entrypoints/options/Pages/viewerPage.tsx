import { useStore } from "../store/index";
import { messageId } from "../../global/message";
import { useState, useEffect, useMemo } from "react";
import {
  BookmarkTreeNode,
  FetchTask,
} from "../../global/types";

import { ImageTextCard } from "../Components/ImageTextCard";
import { BoxItem } from "../Components/PageItem";

import { Box, Typography, Button, Toolbar, TextField, InputAdornment, IconButton, useMediaQuery, useTheme, Drawer, Divider, Stack, Fab, CircularProgress, Paper, Chip } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import ClearIcon from "@mui/icons-material/Clear";
import MenuIcon from "@mui/icons-material/Menu";
import SettingsIcon from "@mui/icons-material/Settings";
import RefreshIcon from "@mui/icons-material/Refresh";
import DownloadIcon from "@mui/icons-material/Download";
import CloseIcon from "@mui/icons-material/Close";
import { FolderTree } from "../Components/FolderTree";
import { FolderCard } from "../Components/FolderCard";
import { FetchSettingsDialog } from "../Components/FetchSettingsDialog";
import { SelectionActionBar } from "../Components/SelectionActionBar";
import { SortControls } from "../Components/SortControls";
import { UrlFilterControls } from "../Components/UrlFilterControls";
import { FavoriteFoldersBar } from "../Components/FavoriteFoldersBar";
import { sortBookmarks, filterByUrlDomains } from "../../global/sortFilterUtils";

import { NavBar } from "../Components/NavBar";
import LaunchIcon from "@mui/icons-material/Launch";
import ChecklistIcon from "@mui/icons-material/Checklist";
import StarIcon from "@mui/icons-material/Star";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import React, { useRef } from "react";

async function startGetThumb(fetchTaskList: FetchTask[]): Promise<void> {
  if (fetchTaskList.length > 0) {
    browser.runtime.sendMessage({
      type: messageId.getThumb,
      fetchTaskList: fetchTaskList,
    });
  } else {
    alert("Bookmarks thumbnail all loaded.");
  }
}

function FetchProgress({ isFetching, progress, total, onStop }: { isFetching: boolean, progress: number, total: number, onStop: () => void }) {
  if (!isFetching) return null;
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
      <Typography variant="body2" color="text.secondary">
        Fetching: {progress} / {total}
      </Typography>
      <Button
        size="small"
        color="error"
        variant="outlined"
        onClick={onStop}
        sx={{ minWidth: 80 }}
      >
        Stop
      </Button>
    </Box>
  );
}



export function ViewerPage() {
  const loadFetchConfig = useStore((state) => state.loadFetchConfig);

  const bookmarkList = useStore((state) => state.bookmarkList);
  const matchBookmarks = useStore((state) => state.matchBookmarks);

  // Removed loadedImageMap subscription to prevent full page re-renders
  // const loadedImageMap = useStore((state) => state.loadedImageMap);

  const matchedBookmarks = useStore((state) => state.matchedBookmarks);
  const fetchTaskList = useStore((state) => state.fetchTaskList);
  const fetchConfigList = useStore((state) => state.fetchConfigList);
  const isFetching = useStore((state) => state.isFetching);
  const fetchProgress = useStore((state) => state.fetchProgress);
  const fetchTotal = useStore((state) => state.fetchTotal);
  const setFetchStatus = useStore((state) => state.setFetchStatus);
  const updateFetchProgress = useStore((state) => state.updateFetchProgress);
  const loadSingleThumb = useStore((state) => state.loadSingleThumb);
  const stopFetching = useStore((state) => state.stopFetching);
  const selectedFolderId = useStore((state) => state.selectedFolderId);
  const setSelectedFolderId = useStore((state) => state.setSelectedFolderId);
  const bookmarkMap = useStore((state) => state.bookmarkMap);
  // selectedBookmarkIds removed, handled by SelectionActionBar
  // const selectedBookmarkIds = useStore((state) => state.selectedBookmarkIds);
  const clearSelection = useStore((state) => state.clearSelection);
  const forceFetchThumbnails = useStore((state) => state.forceFetchThumbnails);
  const downloadMultipleThumbnailsAction = useStore((state) => state.downloadMultipleThumbnailsAction);
  const isLoadingBookmarks = useStore((state) => state.isLoadingBookmarks);
  const setLoadingBookmarks = useStore((state) => state.setLoadingBookmarks);
  const isSelectionMode = useStore((state) => state.isSelectionMode);
  const setIsSelectionMode = useStore((state) => state.setIsSelectionMode);
  const setting = useStore((state) => state.setting);
  const setSetting = useStore((state) => state.setSetting);

  const [searchQuery, setSearchQuery] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);

  const sidebarOpen = useStore((state) => state.sidebarOpen);
  const setSidebarOpen = useStore((state) => state.setSidebarOpen);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  const startMatchBookmarks = async () => {
    // Only show full loading spinner if we don't have any bookmarks yet
    // This prevents scroll position loss on background refreshes
    const hasItems = useStore.getState().matchedBookmarks.length > 0;
    if (!hasItems) {
      setLoadingBookmarks(true);
    }
    try {
      await matchBookmarks();
    } finally {
      setLoadingBookmarks(false);
    }
  };

  useEffect(() => {
    const loadConfig = async () => {
      await loadFetchConfig();
    };
    loadConfig();
    browser.runtime.onMessage.addListener(onMessageListener);

    return () => {
      // Get the latest map from store state instead of using the stale closure
      const currentMap = useStore.getState().loadedImageMap;
      Object.values(currentMap).forEach((blobUrl) => {
        if (blobUrl) {
          URL.revokeObjectURL(blobUrl);
        }
      });
      // Also clear the map in store so next mount reloads from storage
      useStore.getState().clearLoadedImageMap();
      browser.runtime.onMessage.removeListener(onMessageListener);
    };
  }, []);

  useEffect(() => {
    startMatchBookmarks();
  }, [bookmarkList, fetchConfigList]);

  const onMessageListener = async (message: any) => {
    switch (message.type) {
      case messageId.getThumbfinished:
        setFetchStatus(false);
        // Removed startMatchBookmarks() to prevent full page re-render
        // Thumbnails are updated in real-time via singleThumbFinished
        break;
      case messageId.fetchStarted:
        setFetchStatus(true, message.total);
        break;
      case messageId.singleThumbFinished:
        if (message.pageUrl) {
          await loadSingleThumb(message.pageUrl);
        }
        if (message.progress) {
          updateFetchProgress(message.progress);
        }
        break;
      case messageId.fetchStopped:
        setFetchStatus(false);
        break;
    }
  };

  // const getThumbSrc = (bkId: string) => {
  //   return loadedImageMap[bkId] || "";
  // };

  // Identify folders that contain matched bookmarks in their subtree
  const matchedFolderIds = useMemo(() => {
    const ids = new Set<string>();
    const parentMap: Record<string, string> = {};
    const buildParentMap = (node: BookmarkTreeNode) => {
      if (node.children) {
        node.children.forEach(child => {
          parentMap[child.id] = node.id;
          buildParentMap(child);
        });
      }
    };
    const root = useStore.getState().bookmarkTree;
    if (root) buildParentMap(root);

    matchedBookmarks.forEach(bk => {
      let currentId = parentMap[bk.id];
      while (currentId) {
        ids.add(currentId);
        currentId = parentMap[currentId];
      }
    });

    return ids;
  }, [matchedBookmarks]);

  const folderCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    const parentMap: Record<string, string> = {};
    const buildParentMap = (node: BookmarkTreeNode) => {
      if (node.children) {
        node.children.forEach(child => {
          parentMap[child.id] = node.id;
          buildParentMap(child);
        });
      }
    };
    const root = useStore.getState().bookmarkTree;
    if (root) buildParentMap(root);

    matchedBookmarks.forEach(bk => {
      let currentId = parentMap[bk.id];
      while (currentId) {
        counts[currentId] = (counts[currentId] || 0) + 1;
        currentId = parentMap[currentId];
      }
    });
    return counts;
  }, [matchedBookmarks]);

  const displayItems = useMemo(() => {
    const query = searchQuery.toLowerCase();
    
    let items: ({ type: 'bookmark' | 'folder', data: BookmarkTreeNode })[] = [];

    // 1. If searching, show flattened results from matchedBookmarks
    if (query) {
      items = matchedBookmarks.filter(bk =>
        bk.title.toLowerCase().includes(query) || (bk.url || "").toLowerCase().includes(query)
      ).map(bk => ({ type: 'bookmark' as const, data: bk }));
    }
    // 2. If 'All Bookmarks', show all matched bookmarks flattened
    else if (selectedFolderId === "all") {
      items = matchedBookmarks.map(bk => ({ type: 'bookmark' as const, data: bk }));
    }
    // 3. Explorer view: show direct children of the selected folder
    else {
      const currentFolder = bookmarkMap[selectedFolderId];
      if (currentFolder && currentFolder.children) {
        currentFolder.children.forEach(child => {
          if (child.url) {
            // Only show if it matches the config (is in matchedBookmarks)
            if (matchedBookmarks.some(mb => mb.id === child.id)) {
              items.push({ type: 'bookmark', data: child });
            }
          } else {
            // Only show if it contains matched bookmarks in its subtree
            if (matchedFolderIds.has(child.id)) {
              items.push({ type: 'folder', data: child });
            }
          }
        });
      }
    }

    // Apply URL filtering
    items = filterByUrlDomains(items, setting.urlFilters || []);

    // Apply Sorting
    items = sortBookmarks(
      items,
      setting.sortBy || "dateAdded",
      setting.sortOrder || "desc",
      setting.foldersPosition || "top"
    );

    return items;
  }, [
    selectedFolderId,
    matchedBookmarks,
    searchQuery,
    bookmarkMap,
    matchedFolderIds,
    setting.urlFilters,
    setting.sortBy,
    setting.sortOrder,
    setting.foldersPosition
  ]);

  // Handlers moved to SelectionActionBar
  // const handleBatchFetchThumbs = async () => { ... }
  // const handleBatchDownloadThumbs = async () => { ... }

  return (
    <Box sx={{ display: "flex", minHeight: "100vh" }}>
      {/* Sidebar for Desktop */}
      {!isMobile && sidebarOpen && (
        <Box
          sx={{
            width: 280,
            minWidth: 280,
            borderRight: "1px solid",
            borderColor: "divider",
            height: "100vh",
            position: "sticky",
            top: 0,
            overflowY: "auto",
            bgcolor: (theme) => theme.palette.mode === 'light'
              ? "grey.50"
              : "background.default",
          }}
        >
          <Box
            sx={{
              background: (theme) => theme.palette.mode === 'light'
                ? `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`
                : `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.background.paper} 100%)`,
              p: 2.5,
              m: 2,
              borderRadius: "16px",
              boxShadow: "0 4px 15px rgba(0, 0, 0, 0.15)",
            }}
          >
            <Typography
              variant="h6"
              sx={{
                fontWeight: 700,
                color: "white",
                letterSpacing: "0.5px",
                textShadow: "0 1px 3px rgba(0,0,0,0.2)",
              }}
            >
              📁 Folders
            </Typography>
            <Typography
              variant="caption"
              sx={{
                color: "rgba(255, 255, 255, 0.8)",
                fontWeight: 500,
              }}
            >
              Browse your bookmarks
            </Typography>
          </Box>
          <Box sx={{ px: 2 }}>
            <FolderTree />
          </Box>
        </Box>
      )}

      {/* Drawer for Mobile */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: "block", md: "none" },
          "& .MuiDrawer-paper": {
            boxSizing: "border-box",
            width: 280,
            bgcolor: (theme) => theme.palette.mode === 'light'
              ? "grey.50"
              : "background.default",
          },
        }}
      >
        <Box
          sx={{
            background: (theme) => theme.palette.mode === 'light'
              ? `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`
              : `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.background.paper} 100%)`,
            p: 2.5,
            m: 2,
            borderRadius: "16px",
            boxShadow: "0 4px 15px rgba(0, 0, 0, 0.15)",
          }}
        >
          <Typography
            variant="h6"
            sx={{
              fontWeight: 700,
              color: "white",
              letterSpacing: "0.5px",
              textShadow: "0 1px 3px rgba(0,0,0,0.2)",
            }}
          >
            📁 Folders
          </Typography>
          <Typography
            variant="caption"
            sx={{
              color: "rgba(255, 255, 255, 0.8)",
              fontWeight: 500,
            }}
          >
            Browse your bookmarks
          </Typography>
        </Box>
        <Box sx={{ px: 2 }}>
          <FolderTree />
        </Box>
      </Drawer>

      {/* Main Content */}
      <Box sx={{ flexGrow: 1, p: 3, pt: 1, maxWidth: "100%", overflowX: "hidden" }}>
        <BoxItem
          sx={{
            gap: 1,
            py: 2,
            px: 1,
            borderBottom: "1px solid",
            borderColor: "divider",
            mb: 4,
            flexWrap: { xs: "wrap", sm: "nowrap" }
          }}
          justifyContent={"space-between"}
        >
          <Stack direction="row" alignItems="center" spacing={1}>
            <IconButton
              onClick={() => isMobile ? setMobileOpen(true) : setSidebarOpen(!sidebarOpen)}
              sx={{ mr: 1 }}
            >
              <MenuIcon />
            </IconButton>
            <Typography variant="h5" sx={{ fontWeight: 700, color: "text.primary" }}>
              Captured
            </Typography>
          </Stack>
          <Stack direction="row" alignItems="center" spacing={1}>
            {!isFetching && (
              <IconButton
                color={isSelectionMode ? "primary" : "default"}
                onClick={() => setIsSelectionMode(!isSelectionMode)}
                title="Toggle selection mode"
              >
                <ChecklistIcon />
              </IconButton>
            )}
            {!isFetching && (
              <IconButton
                color="primary"
                onClick={() => setSettingsDialogOpen(true)}
              >
                <SettingsIcon />
              </IconButton>
            )}
            {isFetching ? (
              <FetchProgress
                isFetching={isFetching}
                progress={fetchProgress}
                total={fetchTotal}
                onStop={() => {
                  stopFetching();
                }}
              />
            ) : (
              <Button
                variant="contained"
                color="primary"
                startIcon={<LaunchIcon />}
                onClick={async () => {
                  await startGetThumb(fetchTaskList);
                }}
                sx={{ borderRadius: 2, px: 3 }}
              >
                Fetch Thumbnails
              </Button>
            )}
          </Stack>
        </BoxItem>

        <FetchSettingsDialog
          open={settingsDialogOpen}
          onClose={() => setSettingsDialogOpen(false)}
        />

        <Box sx={{ mb: 3, px: 1 }}>
          <TextField
            fullWidth
            variant="outlined"
            placeholder="Search bookmarks by title or URL..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon color="action" />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end" sx={{ gap: 0.25 }}>
                    {searchQuery && (
                      <IconButton size="small" onClick={() => setSearchQuery("")} edge={false}>
                        <ClearIcon fontSize="small" />
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
              },
            }}
            sx={{
              "& .MuiOutlinedInput-root": {
                borderRadius: 3,
                backgroundColor: "background.paper",
                "& .MuiInputAdornment-positionEnd": { gap: 0.25 },
              }
            }}
          />
        </Box>

        {setting.showFavoriteFolders && (
          <FavoriteFoldersBar
            favoriteFolderIds={setting.favoriteFolderIds || []}
            bookmarkMap={bookmarkMap}
            selectedFolderId={selectedFolderId}
            onSelect={setSelectedFolderId}
            aliases={setting.favoriteFolderAliases || {}}
          />
        )}

        <Box sx={{ pb: 8 }}>
          {isLoadingBookmarks && (
            <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", py: 10 }}>
              <CircularProgress size={60} thickness={4} />
            </Box>
          )}

          {!isLoadingBookmarks && displayItems.length === 0 && (
            <Box sx={{ py: 10, textAlign: "center", color: "text.secondary" }}>
              <Typography variant="body1">No items found in this folder matching your configs.</Typography>
            </Box>
          )}

          {!isLoadingBookmarks && displayItems.map((item) => {
            const bk = item.data;
            if (item.type === 'folder') {
              return (
                <FolderCard
                  key={bk.id}
                  title={bk.title}
                  itemCount={folderCounts[bk.id]}
                  onClick={() => setSelectedFolderId(bk.id)}
                />
              );
            }

            const id = bk.id;
            const title = bk.title;
            const url = bk.url as string;
            // No need to pass image prop anymore
            return (
              <ImageTextCard
                key={id}
                bookmarkId={id}
                title={title}
                url={url}
              />
            );
          })}
        </Box>

        {/* Multi-selection Floating Action Bar */}
        <SelectionActionBar />
      </Box>
    </Box>
  );
}

// (bk, index) => {
//           const id = bk.id;
//           const title = bk.title;
//           const url = bk.url as string;
//           const thumbBlobUrl = getThumbSrc(id);
//           return (
//             <ImageTextCard
//               key={index}
//               image={thumbBlobUrl}
//               title={title}
//               url={url}
//             />
//           );
//         }
