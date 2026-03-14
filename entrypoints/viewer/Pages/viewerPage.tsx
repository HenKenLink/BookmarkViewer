import { useStore } from "../store/index";
import { messageId } from "../../global/message";
import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
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
import { SharedFolderTree } from "../../global/components/SharedFolderTree";
import { FolderCard } from "../Components/FolderCard";
import { FetchSettingsDialog } from "../Components/FetchSettingsDialog";
import { SelectionActionBar } from "../Components/SelectionActionBar";
import { SortControls } from "../../global/components/SortControls";
import { UrlFilterControls } from "../../global/components/UrlFilterControls";
import { FavoriteFoldersBar } from "../../global/components/FavoriteFoldersBar";
import { useDisplayBookmarks } from "../../global/hooks/useDisplayBookmarks";

import { NavBar } from "../Components/NavBar";
import LaunchIcon from "@mui/icons-material/Launch";
import ChecklistIcon from "@mui/icons-material/Checklist";
import StarIcon from "@mui/icons-material/Star";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import React, { useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";

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
  const matchedBookmarks = useStore((s) => s.matchedBookmarks);
  const fetchTaskList = useStore((s) => s.fetchTaskList);
  const isFetching = useStore((s) => s.isFetching);
  const fetchProgress = useStore((s) => s.fetchProgress);
  const fetchTotal = useStore((s) => s.fetchTotal);
  const setFetchStatus = useStore((s) => s.setFetchStatus);
  const updateFetchProgress = useStore((s) => s.updateFetchProgress);
  const updateCoverExistsMap = useStore((s) => s.updateCoverExistsMap);
  const stopFetching = useStore((s) => s.stopFetching);
  const bookmarkMap = useStore((s) => s.bookmarkMap);
  const forceFetchThumbnails = useStore((s) => s.forceFetchThumbnails);
  const isLoadingBookmarks = useStore((s) => s.isLoadingBookmarks);
  const isSelectionMode = useStore((s) => s.isSelectionMode);
  const setIsSelectionMode = useStore((s) => s.setIsSelectionMode);
  const setting = useStore((s) => s.setting);
  const setSetting = useStore((s) => s.setSetting);
  const sidebarOpen = useStore((s) => s.sidebarOpen);
  const setSidebarOpen = useStore((s) => s.setSidebarOpen);
  const bookmarkTree = useStore((s) => s.bookmarkTree);
  const expandedFolderIds = useStore((s) => s.expandedFolderIds);
  const setExpandedFolderIds = useStore((s) => s.setExpandedFolderIds);
  const toggleFavoriteFolder = useStore((s) => s.toggleFavoriteFolder);
  const setFavoriteFolderAlias = useStore((s) => s.setFavoriteFolderAlias);
  const getAllBookmarksInFolderAction = useStore((s) => s.getAllBookmarksInFolderAction);
  const clearSelection = useStore((s) => s.clearSelection);
  const downloadMultipleThumbnailsAction = useStore((s) => s.downloadMultipleThumbnailsAction);
  const selectedConfigGroupId = useStore((s) => s.selectedConfigGroupId);
  const storeSetSelectedConfigGroupId = useStore((s) => s.setSelectedConfigGroupId);
  const bookmarkToConfigsMap = useStore((s) => s.bookmarkToConfigsMap);
  const isSettingsLoaded = useStore((s) => s.isSettingsLoaded);

  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const selectedFolderId = searchParams.get("folder") || "all";

  const setSelectedFolderId = (id: string) => {
    if (id === "all") {
      searchParams.delete("folder");
    } else {
      searchParams.set("folder", id);
    }
    setSearchParams(searchParams);
  };

  const setSelectedConfigGroupId = (id: string) => {
    if (id === "all") {
      searchParams.delete("group");
    } else {
      searchParams.set("group", id);
    }
    setSearchParams(searchParams);
  };

  // Sync search params to store for persistence and other components
  const storeSetSelectedFolderId = useStore((s) => s.setSelectedFolderId);
  const storeSelectedFolderId = useStore((s) => s.selectedFolderId);
  
  const isInitializedRef = useRef(false);

  useEffect(() => {
    if (!isSettingsLoaded) return;

    const urlFolderId = searchParams.get("folder");
    const urlGroupId = searchParams.get("group") || "all";
    
    // 1. Folder sync logic
    if (urlFolderId) {
      if (urlFolderId !== storeSelectedFolderId) {
        storeSetSelectedFolderId(urlFolderId);
      }
    } else {
      // URL has no folder. 
      if (!isInitializedRef.current) {
        // Initial load: restore from store to URL if store has a value
        if (storeSelectedFolderId && storeSelectedFolderId !== "all") {
          setSearchParams(params => {
            params.set("folder", storeSelectedFolderId);
            return params;
          }, { replace: true });
        }
      } else {
        // Post-init: if URL is cleared, set store to all
        if (storeSelectedFolderId !== "all") {
          storeSetSelectedFolderId("all");
        }
      }
    }

    // 2. Group sync logic
    if (urlGroupId !== "all") {
      // Group in URL: sync to store if valid
      const groupExists = (setting.configGroups || []).some(g => g.id === urlGroupId);
      if (groupExists) {
        if (urlGroupId !== selectedConfigGroupId) {
          storeSetSelectedConfigGroupId(urlGroupId);
        }
      } else {
        // Invalid group in URL: clear it
        setSearchParams(params => {
          params.delete("group");
          return params;
        }, { replace: true });
      }
    } else {
      // No group in URL
      if (!isInitializedRef.current) {
        // Initial load: restore from store to URL
        if (selectedConfigGroupId && selectedConfigGroupId !== "all") {
          const groupExists = (setting.configGroups || []).some(g => g.id === selectedConfigGroupId);
          if (groupExists) {
            setSearchParams(params => {
              params.set("group", selectedConfigGroupId);
              return params;
            }, { replace: true });
          } else {
            storeSetSelectedConfigGroupId("all");
          }
        }
      } else {
        // Post-init: URL is "all", sync store
        if (selectedConfigGroupId !== "all") {
          storeSetSelectedConfigGroupId("all");
        }
      }
    }

    isInitializedRef.current = true;
  }, [searchParams, storeSelectedFolderId, storeSetSelectedFolderId, selectedConfigGroupId, storeSetSelectedConfigGroupId, setSearchParams, setting.configGroups, isSettingsLoaded]);

  const [searchQuery, setSearchQuery] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [renderedLimit, setRenderedLimit] = useState(30);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  const { displayItems, folderCounts } = useDisplayBookmarks(
    bookmarkTree,
    matchedBookmarks,
    bookmarkMap,
    selectedFolderId,
    searchQuery,
    setting,
    selectedConfigGroupId,
    bookmarkToConfigsMap
  );

  // Reset limit when folder or search changes
  useEffect(() => {
    setRenderedLimit(30);
  }, [selectedFolderId, searchQuery]);

  const loadMoreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isLoadingBookmarks) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && renderedLimit < displayItems.length) {
          // Use a small delay to let the UI settle and prevent infinite recursion loops
          setTimeout(() => {
            setRenderedLimit((prev) => Math.min(prev + 30, displayItems.length));
          }, 32);
        }
      },
      { threshold: 0.1, rootMargin: "400px" }
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => observer.disconnect();
  }, [displayItems.length, renderedLimit, isLoadingBookmarks]);

  useEffect(() => {
    browser.runtime.onMessage.addListener(onMessageListener);

    // Global cleanup on window unload to prevent memory leaks
    const handleUnload = () => {
      const currentMap = useStore.getState().loadedImageMap;
      Object.values(currentMap).forEach((blobUrl) => {
        if (blobUrl) {
          URL.revokeObjectURL(blobUrl);
        }
      });
    };
    window.addEventListener("beforeunload", handleUnload);

    return () => {
      browser.runtime.onMessage.removeListener(onMessageListener);
      window.removeEventListener("beforeunload", handleUnload);
    };
  }, []);

  const onMessageListener = async (message: any) => {
    switch (message.type) {
      case messageId.getThumbfinished:
        setFetchStatus(false);
        break;
      case messageId.fetchStarted:
        setFetchStatus(true, message.total);
        break;
      case messageId.singleThumbFinished:
        if (message.pageUrl) {
          updateCoverExistsMap({ [message.pageUrl]: true });
        }
        if (message.progress) {
          updateFetchProgress(message.progress);
        }
        break;
      case messageId.fetchStopped:
        setFetchStatus(false);
        break;
      case messageId.fetchFailed:
        const bookmark = Object.values(bookmarkMap).find(b => b.url === message.pageUrl);
        toast.error(`Failed to fetch thumbnail for: ${bookmark?.title || message.pageUrl}`, {
          description: "Please check your configuration or network.",
          duration: 4000,
        });
        break;
    }
  };

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
    const handleNavigation = (e: MouseEvent) => {
      // Side buttons: 3 is Back, 4 is Forward
      if (e.button === 3) {
        e.preventDefault();
        e.stopPropagation();
        navigate(-1);
      } else if (e.button === 4) {
        e.preventDefault();
        e.stopPropagation();
        navigate(1);
      }
    };

    // auxclick is specifically for non-left mouse buttons
    window.addEventListener("auxclick", handleNavigation);
    
    // Some browsers/mice might still use mouseup for side buttons
    window.addEventListener("mouseup", handleNavigation);

    return () => {
      window.removeEventListener("auxclick", handleNavigation);
      window.removeEventListener("mouseup", handleNavigation);
    };
  }, [navigate]);

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
            <SharedFolderTree
              bookmarkTree={bookmarkTree}
              matchedBookmarks={matchedBookmarks}
              selectedFolderId={selectedFolderId}
              setSelectedFolderId={setSelectedFolderId}
              selectedConfigGroupId={selectedConfigGroupId}
              setSelectedConfigGroupId={setSelectedConfigGroupId}
              expandedFolderIds={expandedFolderIds}
              setExpandedFolderIds={setExpandedFolderIds}
              setting={setting}
              bookmarkMap={bookmarkMap}
              showContextMenu={true}
              onForceFetchThumbnails={forceFetchThumbnails}
              onToggleFavoriteFolder={toggleFavoriteFolder}
              onSetFavoriteFolderAlias={setFavoriteFolderAlias}
              onGetAllBookmarksInFolder={getAllBookmarksInFolderAction}
            />
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
          <SharedFolderTree
            bookmarkTree={bookmarkTree}
            matchedBookmarks={matchedBookmarks}
            selectedFolderId={selectedFolderId}
            setSelectedFolderId={setSelectedFolderId}
            expandedFolderIds={expandedFolderIds}
            setExpandedFolderIds={setExpandedFolderIds}
            setting={setting}
            bookmarkMap={bookmarkMap}
            showContextMenu={true}
            onForceFetchThumbnails={forceFetchThumbnails}
            onToggleFavoriteFolder={toggleFavoriteFolder}
            onSetFavoriteFolderAlias={setFavoriteFolderAlias}
            onGetAllBookmarksInFolder={getAllBookmarksInFolderAction}
          />
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
            {selectedFolderId !== "all" && (
              <IconButton onClick={handleBack} sx={{ mr: 1 }} size="small">
                <ArrowBackIcon />
              </IconButton>
            )}
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

          {!isLoadingBookmarks && displayItems.slice(0, renderedLimit).map((item) => {
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
            return (
              <ImageTextCard
                key={id}
                bookmarkId={id}
                title={title}
                url={url}
              />
            );
          })}

          {/* Sentinel for Infinite Scroll */}
          {!isLoadingBookmarks && renderedLimit < displayItems.length && (
            <Box ref={loadMoreRef} sx={{ py: 4, display: "flex", justifyContent: "center" }}>
              <CircularProgress size={24} />
            </Box>
          )}
        </Box>

        <SelectionActionBar />
      </Box>
    </Box>
  );
}
