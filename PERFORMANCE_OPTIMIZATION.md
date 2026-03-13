# Performance Optimization Plan: Bookmark Loading & Matching

## 🎯 Objective
Reduce the "Time to Interactive" and CPU usage during the initial load of the Viewer and Popup by optimizing the bookmark-to-config matching algorithm and minimizing storage I/O.

---

## 🔍 Identified Bottlenecks
1.  **Redundant Matching Loop**: `matchBookmarks` iterates through configs and performs storage checks per-config. If multiple configs apply to the same host, the same bookmarks are checked against storage multiple times.
2.  **Frequent State Updates**: `updateLoadedImageMap` is called inside the configuration loop, triggering multiple React re-renders before the matching process is even finished.
3.  **Repetitive URL Parsing**: The hostname of each bookmark is parsed multiple times during the matching process using `new URL()`, which is relatively expensive in a tight loop.
4.  **Synchronous Storage Checks**: `checkBookmarksLoadStatus` is called sequentially inside the loop. While asynchronous, it blocks the completion of the `matchBookmarks` action.

---

## 🏗️ Proposed Optimizations

### 1. Unified Bulk Processing
*   **Strategy**: Decouple "Matching" from "Status Checking".
*   **Action**: 
    *   Iterate through all configs and bookmarks to find all `matchedBookmarks` first.
    *   Once the complete list is identified, perform **one single bulk call** to `checkBookmarksLoadStatus` for the unique set of URLs.
    *   This reduces `browser.storage.local.get` calls to exactly one per refresh.

### 2. Atomic State Commitment
*   **Strategy**: Minimize React re-renders.
*   **Action**: Accumulate both the `matchedBookmarks` list and the `newLoadedImageMap` in local variables. Perform a **single `set()`** call at the very end of the `matchBookmarks` action.

### 3. Pre-computed Hostname Index
*   **Strategy**: Avoid repeated expensive `new URL()` calls.
*   **Action**: In `matchBookmarks`, create a temporary map or extended object that stores the pre-parsed hostname for every bookmark in the `bookmarkList` before starting the config loop.

### 4. Efficient Grouping
*   **Strategy**: Use the host-based grouping I implemented earlier but refine it to handle multiple configs per host more elegantly.

---

## 📋 Implementation Steps
1.  **Update `bookmarkUtils.ts`**:
    *   Modify `checkBookmarksLoadStatus` to handle a flat list of bookmarks efficiently.
2.  **Refactor `bookmarkSlice.ts`**:
    *   Rewrite `matchBookmarks` to follow the "Gather all -> Check status once -> Commit once" pattern.
    *   Implement hostname caching.
3.  **Verification**:
    *   Run `pnpm compile`.
    *   Add console timers (`performance.now()`) to measure the speed improvement for a sample size of ~1000 bookmarks.

---

**Please approve this plan to proceed with the implementation.**
