import { useStore } from "../store/index";
import { messageId } from "../../global/message";
import { useState, useEffect } from "react";
import {
  BookmarkTreeNode,
  MatchedUrl,
  UnstoredUrl,
  LoadedImage,
} from "../../global/types";

import { ImageTextCard } from "../Components/ImageTextCard";
import { BoxItem } from "../Components/PageItem";

import { Box, Typography, Button, Toolbar } from "@mui/material";

import { NavBar } from "../Components/NavBar";
import LaunchIcon from "@mui/icons-material/Launch";

type StoredImage = { pageUrl: string; blobUrl: string };

async function startGetThumb(unStoredUrlList: UnstoredUrl[]): Promise<void> {
  if (unStoredUrlList.length > 0) {
    browser.runtime.sendMessage({
      type: messageId.getThumb,
      unStoredUrlList: unStoredUrlList,
    });
  } else {
    alert("Bookmarks thumbnail all loaded.");
  }
}

export function ViewerPage() {
  const loadFetchConfig = useStore((state) => state.loadFetchConfig);

  const bookmarkList = useStore((state) => state.bookmarkList);
  const matchBookmarks = useStore((state) => state.matchBookmarks);

  const loadedImageMap = useStore((state) => state.loadedImageMap);

  const matchedBookmarkList = useStore((state) => state.matchedBookmarkList);
  const unmatchedUrlList = useStore((state) => state.unStoredUrlList);
  const fetchConfigList = useStore((state) => state.fetchConfigList);

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
      // TODO: Revoke object URLs when component unmounts or map clears?
      // With the map, it's harder to just iterate. 
      // Ideally we track keys. For now, we rely on browser cleanup or manual cleanup if memory issues.
      Object.values(loadedImageMap).forEach((blobUrl) => {
        if (blobUrl) {
          URL.revokeObjectURL(blobUrl);
        }
      });
    };
  }, []);

  useEffect(() => {
    startMatchBookmarks();
  }, [bookmarkList, fetchConfigList]);

  const onMessageListener = async (message: any) => {
    if (message.type == messageId.getThumbfinished) {
      startMatchBookmarks();
    }
  };

  const getThumbSrc = (bkId: string) => {
    return loadedImageMap[bkId] || "";
  };

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
        <Button
          variant="contained"
          color="primary"
          startIcon={<LaunchIcon />}
          onClick={async () => {
            await startGetThumb(unmatchedUrlList);
          }}
          sx={{ borderRadius: 2, px: 3 }}
        >
          Fetch Thumbnails
        </Button>
      </BoxItem>

      <Box sx={{ pb: 8 }}>
        {matchedBookmarkList.flatMap((bookmarkList) =>
          bookmarkList.map((bk, index) => {
            const id = bk.id;
            const title = bk.title;
            const url = bk.url as string;
            const thumbBlobUrl = getThumbSrc(id);
            return (
              <ImageTextCard
                key={id} // 不推荐用 index 做 key，建议用稳定的 id
                image={thumbBlobUrl}
                title={title}
                url={url}
              />
            );
          })
        )}
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
