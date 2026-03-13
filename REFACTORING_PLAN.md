# Popup and Viewer Refactoring Plan

## 🎯 Objective
Currently, `entrypoints/popup/` and `entrypoints/viewer/` duplicate significant amounts of state logic, UI components, and utility functions. The goal is to extract shared code into `entrypoints/global/` and shared UI components so both the popup and full viewer stay perfectly consistent, reducing maintenance overhead and bundle size.

---

## 🏗️ 1. State Management (`store.ts`)
Both `popup/store.ts` and `viewer/store/index.ts` share almost identical logic for managing bookmarks, settings, and loaded images.

**Action Plan:**
1. **Create Shared Store Slice:**
   - Create a new file: `entrypoints/global/store/bookmarkSlice.ts`
   - Extract the shared Zustand state and actions:
     - State: `setting`, `bookmarkTree`, `bookmarkList`, `bookmarkMap`, `matchedBookmarks`, `loadedImageMap`, `fetchConfigList`, `selectedFolderId`, `expandedFolderIds`, `sidebarOpen`, `isLoadingBookmarks`.
     - Actions: `getSetting`, `setSetting`, `loadBookmarkTree`, `loadFetchConfig`, `matchBookmarks`, `updateLoadedImageMap`, `setSelectedFolderId`, `setExpandedFolderIds`, `setSidebarOpen`, `setLoadingBookmarks`.
2. **Refactor Popup Store:**
   - Modify `entrypoints/popup/store.ts` to compose the shared slice. 
   - Remove duplicated functions like `matchBookmarks` and `loadBookmarkTree`.
3. **Refactor Viewer Store:**
   - Modify `entrypoints/viewer/store/index.ts` to compose the shared slice.
   - Keep viewer-specific state (like multi-selection, `fetchTaskList`, fetch progress, and context menu actions) locally in the viewer store.

---

## 🧩 2. Shared UI Components
Many components in `popup/Components/` are exact or near-exact replicas of components in `viewer/Components/`.

### A. FolderTree Component
**Current State:** 
- `popup/Components/PopupFolderTree.tsx`
- `viewer/Components/FolderTree.tsx`

**Action Plan:**
1. Create `entrypoints/global/components/SharedFolderTree.tsx`.
2. Merge the logic. Use props to toggle viewer-specific features (like Context Menus for Favorites and Folders).
3. Update both popup and viewer to import this shared component.
4. Delete `popup/Components/PopupFolderTree.tsx`.

### B. Bookmark Card Component
**Current State:**
- `popup/Components/PopupBookmarkCard.tsx`
- `viewer/Components/ImageTextCard.tsx`

**Action Plan:**
1. These components look slightly different (Popup card is smaller/horizontal, Viewer card is larger). 
2. Create a generic `entrypoints/global/components/BookmarkCardBase.tsx` that handles the IntersectionObserver (for lazy loading images), the fallback icon logic, and domain extraction.
3. Keep the specific UI wrappers (`PopupBookmarkCard` and `ImageTextCard`) but make them use the `BookmarkCardBase` logic to ensure image loading logic is identical.

### C. Search & Top Bar Components
**Current State:**
- Both apps use `SortControls`, `UrlFilterControls`, and `FavoriteFoldersBar`.
- Popup currently imports these directly from `entrypoints/viewer/Components/`.

**Action Plan:**
1. Move the following files from `entrypoints/viewer/Components/` to `entrypoints/global/components/`:
   - `SortControls.tsx`
   - `UrlFilterControls.tsx`
   - `FavoriteFoldersBar.tsx`
2. Update imports in both `popup/App.tsx` and `viewer/Pages/viewerPage.tsx`.

---

## ⚙️ 3. Utility Functions & Constants
**Current State:**
- Viewer has `entrypoints/viewer/utils.ts` containing `filterBookmarkByMatchPattern` and `checkBookmarksLoadStatus`.
- Popup currently imports these directly from `entrypoints/viewer/utils.ts`.
- `consts.ts` is in the viewer but used by both.

**Action Plan:**
1. Move `entrypoints/viewer/utils.ts` to `entrypoints/global/bookmarkUtils.ts`.
2. Move constants (`SETTINGS_KEY`, `CONFIGS_KEY`) from `entrypoints/viewer/consts.ts` to `entrypoints/global/consts.ts`.
3. Update all import paths in both popup and viewer.

---

## 🎨 4. Theme & Initialization Logic (App.tsx)
**Current State:**
- `popup/App.tsx` and `viewer/App.tsx` both define exactly the same `lightTheme` and `darkTheme`.
- Both have duplicated logic for determining `displayItems` (filtering by URL, sorting, searching).

**Action Plan:**
1. Create `entrypoints/global/theme.ts` and export `lightTheme` and `darkTheme`.
2. Extract the `displayItems` `useMemo` block into a custom hook: `entrypoints/global/hooks/useDisplayBookmarks.ts`. This hook will take `searchQuery`, `selectedFolderId`, and `storeData`, returning the sorted/filtered array.
3. Apply this hook to both `popup/App.tsx` and `viewer/Pages/viewerPage.tsx` to ensure search and filtering behave identically.

---

## 📋 Execution Order for AI Assistant
When executing this plan, strictly follow this order to prevent breaking the build:
1. Create `entrypoints/global/consts.ts` and `entrypoints/global/theme.ts`. Update imports.
2. Move Viewer utilities to `entrypoints/global/bookmarkUtils.ts`. Update imports.
3. Move `SortControls`, `UrlFilterControls`, and `FavoriteFoldersBar` to `global/components/`. Update imports.
4. Extract the Zustand slice to `global/store/bookmarkSlice.ts` and refactor both `popup/store.ts` and `viewer/store/index.ts`.
5. Extract the custom hook `useDisplayBookmarks.ts`.
6. Consolidate `FolderTree` into a shared component.
7. Run `pnpm compile` to ensure no TypeScript errors remain.
