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

type StoredImage = { pageUrl: string; blobUrl: string };

async function startGetThumb(unStoredUrlList: UnstoredUrl[]): Promise<void> {
  console.log("Start to get thumbnail, unStoredUrlList", unStoredUrlList);
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

  const loadedImageList = useStore((state) => state.loadedImageList);

  const matchedBookmarkList = useStore((state) => state.matchedBookmarkList);
  const unStoredUrlList = useStore((state) => state.unStoredUrlList);
  const matchedUrlList = useStore((state) => state.matchedUrlList);

  console.log("matchedUrlList in viewer page: ", matchedUrlList);
  console.log("unStoredUrlList in viewer page: ", unStoredUrlList);
  console.log("matchedBookmarkList in viewer page: ", matchedBookmarkList);

  // const [matchedBookmarkList, setMatchedBookmarkList] = useState<BookmarkTreeNode[]>([]);
  // const [matchedUrlList, setMatchedUrlList] = useState<MatchedUrl[]>([]);
  // const [unStoredUrlList, setUnStoredUrlList] = useState<UnstoredUrl[]>([]);

  const startMatchBookmarks = async () => {
    const matchRes = await matchBookmarks();
    console.log("matchRes.matchedUrlList in APP: ", matchRes.matchedUrlList);
  };

  useEffect(() => {
    const loadConfig = async () => {
      await loadFetchConfig();
    };
    loadConfig();
    browser.runtime.onMessage.addListener(onMessageListener);

    return () => {
      loadedImageList.forEach((loadedImage) => {
        const blobUrl: string = loadedImage.blobUrl;
        if (blobUrl) {
          URL.revokeObjectURL(blobUrl);
        }
      });
    };
  }, []);

  useEffect(() => {
    console.log("bookmarkList", bookmarkList);
    startMatchBookmarks();
  }, [bookmarkList]);

  const onMessageListener = async (message: any) => {
    if (message.type == messageId.getThumbfinished) {
      startMatchBookmarks();
    }
  };

  const getThumbSrc = (bkId: string) => {
    const thumb: LoadedImage = loadedImageList.filter((loadedImage) => {
      return loadedImage.bookmarkId === bkId;
    })[0];
    if (thumb) {
      return thumb.blobUrl;
    } else {
      return "";
    }
  };

  return (
    <Box>
      <BoxItem>
        <Button
          variant="contained"
          color="primary"
          size="medium"
          onClick={async () => {
            await startGetThumb(unStoredUrlList);
          }}
        >
          Open Tabs
        </Button>
      </BoxItem>

      <Box>
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
//           console.log("thumbBlobUrl: ", thumbBlobUrl);
//           return (
//             <ImageTextCard
//               key={index}
//               image={thumbBlobUrl}
//               title={title}
//               url={url}
//             />
//           );
//         }
