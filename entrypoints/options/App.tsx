import { useStore } from "./store/index";
import { messageId } from "../global/message";
import { useState, useEffect } from "react";
import { useLoadBookmarks } from "./hooks/useLoadBookmarks";
import { testHostnameList } from "../global/test";
import { BookmarkTreeNode, MatchedUrl } from "../global/types";

type StoredImage = { pageUrl: string; blobUrl: string };

async function startGetThumb(matchedUrlList: MatchedUrl[]): Promise<void> {
  browser.runtime.sendMessage({
    type: messageId.getThumb,
    matchedUrlList: matchedUrlList,
  });
}

async function getStoredImages(pageUrlList: string[]): Promise<StoredImage[]> {
  const storedImageList: StoredImage[] = [];

  for (const pageUrl of pageUrlList) {
    try {
      if (pageUrl) {
        const res = await browser.storage.local.get(pageUrl);
        const buf = new Uint8Array(res[pageUrl]);
        console.log("Buf retrive from storage: ", buf);
        const blob = new Blob([buf.buffer], { type: "image/jpeg" });
        const blobUrl = URL.createObjectURL(blob);
        let storedImage = { pageUrl: pageUrl, blobUrl: blobUrl };
        storedImageList.push(storedImage);
      } else {
        console.log("function getStoredImages: bookmarkNode url undefined.");
        continue;
      }
    } catch (e) {
      console.error("Fail to get image.");
      continue;
    }
  }
  return storedImageList;
}

export default function App() {
  useLoadBookmarks();

  const bookmarkList = useStore((state) => state.bookmarkList);
  const matchBookmarks = useStore((state) => state.matchBookmarks);

  const loadedImageList = useStore((state) => state.loadedImageList);

  // const [imageList, setImageList] = useState<StoredImage[]>([]);
  // const imageListRef = useRef<StoredImage[]>([]);

  // useEffect(() => {
  //   imageListRef.current = imageList;
  // }, [imageList]);

  const [matchedUrlList, setMatchedUrlList] = useState<MatchedUrl[]>([]);

  const updateMatchedUrlList = async () => {
    const matchRes = await matchBookmarks(testHostnameList);
    setMatchedUrlList(matchRes);
    console.log("matchedUrlList: ", matchedUrlList);
  };

  useEffect(() => {
    console.log("bookmarkList", bookmarkList);
    updateMatchedUrlList();
  }, [bookmarkList]);

  const onMessageListener = async (message: any) => {
    if (message.type == messageId.getThumbfinished) {
      updateMatchedUrlList();
    }
  };

  useEffect(() => {
    // const init = async () => {
    //   const matchedUrlList = matchBookmarks(testHostname).matchedUrlList;
    //   console.log("matchedUrlList: ", matchedUrlList);
    //   const res = matchBookmarks(testHostname);
    //   console.log("res: ", res);
    //   // let storedImageList: StoredImage[] = await getStoredImages(
    //   //   matchedUrlList
    //   // );
    //   // setImageList(storedImageList);
    // };
    // init();
    // const listener = async (changes: any) => {
    //   console.log("Storage changed items: ", changes);
    //   const currentImageList = imageListRef.current;
    //   // 复制 current imageList 数据
    //   let newImageList = currentImageList.map((item) => ({
    //     ...item,
    //   }));
    //   const changedkeys = Object.keys(changes);
    //   let resImages: StoredImage[] = await getStoredImages(changedkeys);
    //   for (const newImage of resImages) {
    //     // 查找重复项index
    //     const index = newImageList.findIndex(
    //       (img) => img.pageUrl === newImage.pageUrl
    //     );
    //     if (index !== -1) {
    //       // 释放原blobUrl
    //       URL.revokeObjectURL(newImageList[index].blobUrl);
    //       newImageList[index].blobUrl = newImage.blobUrl;
    //     } else {
    //       newImageList.push(newImage);
    //     }
    //   }
    //   setImageList(newImageList);
    // };
    // browser.storage.local.onChanged.addListener(listener);
    // return () => {
    //   browser.storage.local.onChanged.removeListener(listener);
    //   for (const image of imageListRef.current) {
    //     URL.revokeObjectURL(image.blobUrl);
    //   }
    //   setImageList([]);
    // };
    browser.runtime.onMessage.addListener(onMessageListener);
  }, []);

  return (
    <>
      <button
        onClick={async () => {
          await startGetThumb(matchedUrlList);
        }}
      >
        Open Tabs
      </button>
      <div style={{ display: "flex" }}>
        {loadedImageList.map((image, index) => {
          const blobUrl = image.blobUrl;
          console.log("Mapping url, index: ", index, " BlobUrl: ", blobUrl);
          return <img key={index} src={image.blobUrl} alt={`img-${index}`} />;
        })}
      </div>
    </>
  );
}
