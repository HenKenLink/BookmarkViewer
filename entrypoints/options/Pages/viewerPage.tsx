import { useStore } from "../store/index";
import { messageId } from "../../global/message";
import { useState, useEffect } from "react";
import {
  BookmarkTreeNode,
  FetchTask,
} from "../../global/types";

import { ImageTextCard } from "../Components/ImageTextCard";
import { BoxItem } from "../Components/PageItem";

import { Box, Typography, Button, Toolbar, TextField, InputAdornment, IconButton } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import ClearIcon from "@mui/icons-material/Clear";

import { NavBar } from "../Components/NavBar";
import LaunchIcon from "@mui/icons-material/Launch";

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

  const loadedImageMap = useStore((state) => state.loadedImageMap);

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

  const [searchQuery, setSearchQuery] = useState("");

  const startMatchBookmarks = async () => {
    await matchBookmarks();
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
        startMatchBookmarks();
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

  const getThumbSrc = (bkId: string) => {
    return loadedImageMap[bkId] || "";
  };

  const filteredBookmarks = matchedBookmarks.filter((bk) => {
    const title = bk.title.toLowerCase();
    const url = (bk.url || "").toLowerCase();
    const query = searchQuery.toLowerCase();
    return title.includes(query) || url.includes(query);
  });

  return (
    <Box>
      <BoxItem
        sx={{
          gap: 1,
          py: 3,
          px: 1,
          borderBottom: "1px solid",
          borderColor: "divider",
          mb: 4
        }}
        justifyContent={"space-between"}
      >
        <Typography variant="h5" sx={{ fontWeight: 700, color: "text.primary" }}>
          Captured Bookmarks
        </Typography>
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
      </BoxItem>

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
              endAdornment: searchQuery && (
                <InputAdornment position="end">
                  <IconButton
                    size="small"
                    onClick={() => setSearchQuery("")}
                    edge="end"
                  >
                    <ClearIcon fontSize="small" />
                  </IconButton>
                </InputAdornment>
              ),
            },
          }}
          sx={{
            "& .MuiOutlinedInput-root": {
              borderRadius: 3,
              backgroundColor: "background.paper",
            }
          }}
        />
      </Box>

      <Box sx={{ pb: 8 }}>
        {filteredBookmarks.map((bk) => {
          const id = bk.id;
          const title = bk.title;
          const url = bk.url as string;
          const thumbBlobUrl = getThumbSrc(id);
          return (
            <ImageTextCard
              key={id}
              image={thumbBlobUrl}
              title={title}
              url={url}
            />
          );
        })}
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
