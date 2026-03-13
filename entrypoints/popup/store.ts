import { create } from "zustand";
import { BookmarkSlice, createBookmarkSlice } from "../global/store/bookmarkSlice";

type PopupStore = BookmarkSlice;

export const usePopupStore = create<PopupStore>()((...a) => ({
  ...createBookmarkSlice(...a),
}));
