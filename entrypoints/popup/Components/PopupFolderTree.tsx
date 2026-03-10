import React, { useMemo, useState } from "react";
import {
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Collapse,
  Box,
  alpha,
  Typography,
} from "@mui/material";
import FolderIcon from "@mui/icons-material/Folder";
import FolderOpenIcon from "@mui/icons-material/FolderOpen";
import ExpandLess from "@mui/icons-material/ExpandLess";
import ExpandMore from "@mui/icons-material/ExpandMore";
import AllInclusiveIcon from "@mui/icons-material/AllInclusive";
import StarIcon from "@mui/icons-material/Star";
import { BookmarkTreeNode } from "@/entrypoints/global/types";
import { usePopupStore } from "../store";

interface TreeItemProps {
  node: BookmarkTreeNode;
  level: number;
  selectedId: string;
  expandedIds: Set<string>;
  onSelect: (id: string) => void;
  onToggle: (id: string, expanded: boolean) => void;
}

const TreeItem: React.FC<TreeItemProps> = ({ node, level, selectedId, expandedIds, onSelect, onToggle }) => {
  const open = expandedIds.has(node.id);
  const hasChildren = node.children && node.children.some((child: BookmarkTreeNode) => !child.url);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect(node.id);
  };

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggle(node.id, !open);
  };

  return (
    <>
      <ListItemButton
        selected={selectedId === node.id}
        onClick={handleClick}
        sx={{
          pl: level * 1.5 + 1,
          py: 0.5,
          borderRadius: 1.5,
          mb: 0.25,
          minHeight: 32,
          transition: "all 0.15s ease",
          "&:hover": {
            backgroundColor: (theme) => alpha(theme.palette.primary.main, 0.08),
            "& .MuiListItemIcon-root": { color: "primary.main" },
          },
          "&.Mui-selected": {
            backgroundColor: (theme) =>
              theme.palette.mode === "light" ? "primary.main" : "primary.dark",
            color: "white",
            fontWeight: 600,
            "&:hover": {
              backgroundColor: (theme) =>
                theme.palette.mode === "light" ? "primary.dark" : "primary.main",
            },
            "& .MuiListItemIcon-root": { color: "white" },
            "& .MuiListItemText-primary": { color: "white" },
          },
        }}
      >
        <ListItemIcon sx={{ minWidth: 24, color: "primary.main" }}>
          {open ? (
            <FolderOpenIcon sx={{ fontSize: 16 }} />
          ) : (
            <FolderIcon sx={{ fontSize: 16 }} />
          )}
        </ListItemIcon>
        <ListItemText
          primary={node.title || "Untitled Folder"}
          primaryTypographyProps={{
            variant: "body2",
            fontSize: "0.8rem",
            fontWeight: selectedId === node.id ? 600 : 400,
            noWrap: true,
          }}
        />
        {hasChildren && (
          <Box onClick={handleToggle} sx={{ display: "flex", alignItems: "center", ml: 0.5 }}>
            {open ? (
              <ExpandLess sx={{ fontSize: 16 }} />
            ) : (
              <ExpandMore sx={{ fontSize: 16 }} />
            )}
          </Box>
        )}
      </ListItemButton>

      {hasChildren && (
        <Collapse in={open} timeout="auto" unmountOnExit>
          <List component="div" disablePadding>
            {node
              .children!.filter((child: BookmarkTreeNode) => !child.url)
              .map((child: BookmarkTreeNode) => (
                <TreeItem
                  key={child.id}
                  node={child}
                  level={level + 1}
                  selectedId={selectedId}
                  expandedIds={expandedIds}
                  onSelect={onSelect}
                  onToggle={onToggle}
                />
              ))}
          </List>
        </Collapse>
      )}
    </>
  );
};

export const PopupFolderTree: React.FC = () => {
  const bookmarkTree = usePopupStore((s) => s.bookmarkTree);
  const matchedBookmarks = usePopupStore((s) => s.matchedBookmarks);
  const selectedFolderId = usePopupStore((s) => s.selectedFolderId);
  const setSelectedFolderId = usePopupStore((s) => s.setSelectedFolderId);
  const expandedFolderIds = usePopupStore((s) => s.expandedFolderIds);
  const setExpandedFolderIds = usePopupStore((s) => s.setExpandedFolderIds);
  const setting = usePopupStore((s) => s.setting);
  const bookmarkMap = usePopupStore((s) => s.bookmarkMap);

  const favoriteFolderIds = setting.favoriteFolderIds || [];
  const favoriteFolderAliases = setting.favoriteFolderAliases || {};

  console.log("[PopupFolderTree] Favorites:", favoriteFolderIds, "Map ready:", Object.keys(bookmarkMap).length > 0);

  const [favoritesExpanded, setFavoritesExpanded] = useState(true);

  const expandedIdsSet = useMemo(() => new Set(expandedFolderIds), [expandedFolderIds]);

  const handleToggle = (id: string, expanded: boolean) => {
    const newIds = new Set(expandedFolderIds);
    if (expanded) newIds.add(id);
    else newIds.delete(id);
    setExpandedFolderIds(Array.from(newIds));
  };

  // Build parent map to find ancestor folders of matched bookmarks
  const matchedFolderIds = useMemo(() => {
    const ids = new Set<string>();
    const parentMap: Record<string, string> = {};
    const buildParentMap = (node: BookmarkTreeNode) => {
      if (node.children) {
        node.children.forEach((child: BookmarkTreeNode) => {
          parentMap[child.id] = node.id;
          buildParentMap(child);
        });
      }
    };
    if (bookmarkTree) buildParentMap(bookmarkTree);
    matchedBookmarks.forEach((bk) => {
      let currentId = parentMap[bk.id];
      while (currentId) {
        ids.add(currentId);
        currentId = parentMap[currentId];
      }
    });
    return ids;
  }, [bookmarkTree, matchedBookmarks]);

  // Filter tree to only folders containing matched bookmarks
  const filteredTree = useMemo(() => {
    if (!bookmarkTree) return null;
    const filterNode = (node: BookmarkTreeNode): BookmarkTreeNode | null => {
      if (node.url) return null;
      const filteredChildren = node.children
        ? node.children
            .map((child: BookmarkTreeNode) => filterNode(child))
            .filter((child): child is BookmarkTreeNode => child !== null)
        : [];
      if (matchedFolderIds.has(node.id) || filteredChildren.length > 0) {
        return { ...node, children: filteredChildren };
      }
      return null;
    };
    return filterNode(bookmarkTree);
  }, [bookmarkTree, matchedFolderIds]);

  return (
    <List sx={{ width: "100%", bgcolor: "transparent", py: 0.5 }} component="nav">
      {/* All Bookmarks */}
      <ListItemButton
        selected={selectedFolderId === "all"}
        onClick={() => setSelectedFolderId("all")}
        sx={{
          py: 0.5,
          borderRadius: 1.5,
          mb: 0.5,
          minHeight: 32,
          transition: "all 0.15s ease",
          "&:hover": {
            backgroundColor: (theme) => alpha(theme.palette.primary.main, 0.08),
            "& .MuiListItemIcon-root": { color: "primary.main" },
          },
          "&.Mui-selected": {
            backgroundColor: (theme) =>
              theme.palette.mode === "light" ? "primary.main" : "primary.dark",
            color: "white",
            fontWeight: 600,
            "&:hover": {
              backgroundColor: (theme) =>
                theme.palette.mode === "light" ? "primary.dark" : "primary.main",
            },
            "& .MuiListItemIcon-root": { color: "white" },
            "& .MuiListItemText-primary": { color: "white" },
          },
        }}
      >
        <ListItemIcon sx={{ minWidth: 24, color: "primary.main" }}>
          <AllInclusiveIcon sx={{ fontSize: 16 }} />
        </ListItemIcon>
        <ListItemText
          primary="All Bookmarks"
          primaryTypographyProps={{
            variant: "body2",
            fontSize: "0.8rem",
            fontWeight: selectedFolderId === "all" ? 600 : 400,
          }}
        />
      </ListItemButton>

      {/* Favorites Section */}
      {favoriteFolderIds.length > 0 && (
        <Box sx={{ mb: 1 }}>
          <ListItemButton
            onClick={() => setFavoritesExpanded(!favoritesExpanded)}
            sx={{ px: 1, py: 0.25, "&:hover": { backgroundColor: "transparent" } }}
          >
            <Typography
              variant="overline"
              sx={{ color: "text.secondary", fontWeight: 600, fontSize: "0.6rem", flexGrow: 1 }}
            >
              FAVORITES
            </Typography>
            {favoritesExpanded ? (
              <ExpandLess sx={{ fontSize: 14, color: "text.secondary" }} />
            ) : (
              <ExpandMore sx={{ fontSize: 14, color: "text.secondary" }} />
            )}
          </ListItemButton>
          <Collapse in={favoritesExpanded} timeout="auto" unmountOnExit>
            <List component="div" disablePadding>
              {favoriteFolderIds.map((id) => {
                const folder = bookmarkMap[id];
                if (!folder) {
                  console.warn(`[PopupFolderTree] Favorite folder ${id} not found in map`);
                  return null;
                }
                const displayName = favoriteFolderAliases[id] || folder.title || "Untitled Folder";
                return (
                  <ListItemButton
                    key={`fav-${id}`}
                    selected={selectedFolderId === id}
                    onClick={() => setSelectedFolderId(id)}
                    sx={{
                      py: 0.5,
                      pl: 1,
                      borderRadius: 1.5,
                      mb: 0.25,
                      minHeight: 32,
                      transition: "all 0.15s ease",
                      "&:hover": {
                        backgroundColor: (theme) =>
                          alpha(theme.palette.warning.main, 0.08),
                        "& .MuiListItemIcon-root": { color: "warning.main" },
                      },
                      "&.Mui-selected": {
                        backgroundColor: (theme) =>
                          theme.palette.mode === "light" ? "warning.main" : "warning.dark",
                        color: "white",
                        "&:hover": {
                          backgroundColor: (theme) =>
                            theme.palette.mode === "light" ? "warning.dark" : "warning.main",
                        },
                        "& .MuiListItemIcon-root": { color: "white" },
                        "& .MuiListItemText-primary": { color: "white" },
                      },
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 24, color: "warning.main" }}>
                      <StarIcon sx={{ fontSize: 16 }} />
                    </ListItemIcon>
                    <ListItemText
                      primary={displayName}
                      primaryTypographyProps={{
                        variant: "body2",
                        fontSize: "0.8rem",
                        fontWeight: selectedFolderId === id ? 600 : 400,
                        noWrap: true,
                      }}
                    />
                  </ListItemButton>
                );
              })}
              {favoriteFolderIds.length > 0 && favoriteFolderIds.every(id => !bookmarkMap[id]) && (
                <Typography variant="caption" sx={{ px: 2, py: 1, color: "text.secondary", fontStyle: "italic", fontSize: "0.65rem" }}>
                  Loading favorites...
                </Typography>
              )}
            </List>
          </Collapse>
        </Box>
      )}

      {/* Folders Section */}
      <Typography
        variant="overline"
        sx={{ px: 1, color: "text.secondary", fontWeight: 600, fontSize: "0.6rem", display: "block", mb: 0.25 }}
      >
        FOLDERS
      </Typography>
      {filteredTree &&
        filteredTree.children &&
        filteredTree.children
          .filter((child: BookmarkTreeNode) => !child.url)
          .map((child: BookmarkTreeNode) => (
            <TreeItem
              key={child.id}
              node={child}
              level={0}
              selectedId={selectedFolderId}
              expandedIds={expandedIdsSet}
              onSelect={setSelectedFolderId}
              onToggle={handleToggle}
            />
          ))}
    </List>
  );
};
