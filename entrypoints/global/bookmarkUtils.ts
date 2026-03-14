import { BookmarkTreeNode } from "./types";

type MatchPattern = {
  hostname: string;
  regexPattern?: string;
};

export function filterBookmarkByMatchPattern(
  bookmarkList: BookmarkTreeNode[],
  matchPattern: MatchPattern
): BookmarkTreeNode[] {
  let targetHostname = matchPattern.hostname;
  if (targetHostname.includes("://")) {
    try {
      targetHostname = new URL(targetHostname).hostname;
    } catch (e) {}
  }
  
  const regex = matchPattern.regexPattern ? new RegExp(matchPattern.regexPattern) : null;

  return bookmarkList.filter((bk) => {
    const url = bk.url;
    if (!url) return false;

    try {
      const urlObj = new URL(url);
      if (urlObj.hostname !== targetHostname) return false;
      if (regex && !regex.test(url)) return false;
      return true;
    } catch (e) {
      return false;
    }
  });
}


