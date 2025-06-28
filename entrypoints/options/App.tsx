import { useStore } from "./store/index";
import { messageId } from "../global/message";
import { useState, useEffect } from "react";
import { useLoadBookmarks } from "./hooks/useLoadBookmarks";
import {
  BookmarkTreeNode,
  MatchedUrl,
  UnstoredUrl,
  LoadedImage,
} from "../global/types";

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

export default function App() {
  useLoadBookmarks();

  const loadFetchConfig = useStore((state) => state.loadFetchConfig);

  const bookmarkList = useStore((state) => state.bookmarkList);
  const matchBookmarks = useStore((state) => state.matchBookmarks);

  const loadedImageList = useStore((state) => state.loadedImageList);

  const matchedBookmarkList = useStore((state) => state.matchedBookmarkList);
  const unStoredUrlList = useStore((state) => state.unStoredUrlList);
  const matchedUrlList = useStore((state) => state.matchedUrlList);

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

    // if ()
  };

  return (
    <>
      <button
        onClick={async () => {
          await startGetThumb(unStoredUrlList);
        }}
      >
        Open Tabs
      </button>
      <div>
        {matchedBookmarkList.map((bk, index) => {
          const id = bk.id;
          const title = bk.title;
          const url = bk.url;
          const thumbBlobUrl = getThumbSrc(id);
          console.log("thumbBlobUrl: ", thumbBlobUrl);
          let thumbElement;
          if (thumbBlobUrl) {
            thumbElement = (
              <div style={{ display: "block" }}>
                <a href={url} target="_blank" rel="noopener noreferrer">
                  <img
                    src={thumbBlobUrl}
                    alt={title}
                    style={{ width: "400px", height: "auto" }}
                  />
                </a>
              </div>
            );
          } else {
            thumbElement = <></>;
          }
          return (
            <div key={id} id={id}>
              {thumbElement}
              <div style={{ display: "flex" }}>
                <span style={{ marginRight: "25px" }}>{title}:</span>
                <a href={url} target="_blank" rel="noopener noreferrer">
                  {url}
                </a>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

// <div style={{ display: "flex" }}>
//   <div style={{ display: "block" }}>
//     {loadedImageList.map((image, index) => {
//       const blobUrl = image.blobUrl;
//       console.log("Mapping url, index: ", index, " BlobUrl: ", blobUrl);
//       return <img key={index} src={image.blobUrl} alt={`img-${index}`} />;
//     })}
//   </div>
// </div>
