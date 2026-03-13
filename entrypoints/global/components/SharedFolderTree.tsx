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
  Menu,
  MenuItem,
  Divider,
} from "@mui/material";
import FolderIcon from "@mui/icons-material/Folder";
import FolderOpenIcon from "@mui/icons-material/FolderOpen";
import ExpandLess from "@mui/icons-material/ExpandLess";
import ExpandMore from "@mui/icons-material/ExpandMore";
import AllInclusiveIcon from "@mui/icons-material/AllInclusive";
import VisibilityIcon from "@mui/icons-material/Visibility";
import EditIcon from "@mui/icons-material/Edit";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import RefreshIcon from "@mui/icons-material/Refresh";
import StarIcon from "@mui/icons-material/Star";
import StarBorderIcon from "@mui/icons-material/StarBorder";
import { BookmarkTreeNode, Setting } from "../types";
import { ContextMenu, ContextMenuItem } from "@/entrypoints/viewer/Components/ContextMenu";

export interface SharedFolderTreeProps {
  bookmarkTree: BookmarkTreeNode | null;
  matchedBookmarks: BookmarkTreeNode[];
  selectedFolderId: string;
  setSelectedFolderId: (id: string) => void;
  expandedFolderIds: string[];
  setExpandedFolderIds: (ids: string[]) => void;
  setting: Setting;
  bookmarkMap: Record<string, BookmarkTreeNode>;
  
  // Optional Context Menu props (for viewer)
  showContextMenu?: boolean;
  onForceFetchThumbnails?: (bookmarkIds: string[]) => void;
  onToggleFavoriteFolder?: (id: string) => void;
  onSetFavoriteFolderAlias?: (id: string, alias: string) => void;
  onGetAllBookmarksInFolder?: (id: string) => BookmarkTreeNode[];
}

interface TreeItemProps {
  node: BookmarkTreeNode;
  level: number;
  selectedId: string;
  expandedIds: Set<string>;
  onSelect: (id: string) => void;
  onToggle: (id: string, expanded: boolean) => void;
  isFavorite: boolean;
  
  showContextMenu?: boolean;
  onShowBookmarks?: (id: string) => void;
  onForceFetchThumbs?: (id: string) => void;
  onToggleFavorite?: (id: string) => void;
}

const TreeItem: React.FC<TreeItemProps> = ({ 
  node, level, selectedId, expandedIds, onSelect, onToggle, isFavorite,
  showContextMenu, onShowBookmarks, onForceFetchThumbs, onToggleFavorite 
}) => {
  const open = expandedIds.has(node.id);
  const hasChildren = node.children && node.children.some((child: BookmarkTreeNode) => !child.url);

  const [contextMenu, setContextMenu] = useState<{ mouseX: number; mouseY: number } | null>(null);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect(node.id);
  };

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggle(node.id, !open);
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    if (!showContextMenu) return;
    e.preventDefault();
    e.stopPropagation();
    setContextMenu(
      contextMenu === null
        ? { mouseX: e.clientX, mouseY: e.clientY }
        : null
    );
  };

  const handleCloseContextMenu = () => {
    setContextMenu(null);
  };

  const handleShowBookmarksAction = () => {
    if (onShowBookmarks) onShowBookmarks(node.id);
    handleCloseContextMenu();
  };

  const handleForceFetchThumbsAction = () => {
    if (onForceFetchThumbs) onForceFetchThumbs(node.id);
    handleCloseContextMenu();
  };

  const handleToggleFavoriteAction = () => {
    if (onToggleFavorite) onToggleFavorite(node.id);
    handleCloseContextMenu();
  };

  const contextMenuItems: ContextMenuItem[] = showContextMenu ? [
    {
      label: "Show bookmarks",
      icon: <VisibilityIcon fontSize="small" />,
      onClick: handleShowBookmarksAction,
    },
    {
      label: "Fetch thumbnails",
      icon: <RefreshIcon fontSize="small" />,
      onClick: handleForceFetchThumbsAction,
    },
    {
      label: isFavorite ? "Remove from Favorites" : "Add to Favorites",
      icon: isFavorite ? <StarIcon fontSize="small" sx={{ color: "warning.main" }} /> : <StarBorderIcon fontSize="small" />,
      onClick: handleToggleFavoriteAction,
      divider: true
    },
  ] : [];

  return (
    <>
      <ListItemButton
        selected={selectedId === node.id}
        onClick={handleClick}
        onContextMenu={handleContextMenu}
        sx={{
          pl: level * 2 + 2,
          py: 1,
          borderRadius: 2,
          mb: 0.5,
          transition: "all 0.2s ease",
          "&:hover": {
            backgroundColor: (theme) => alpha(theme.palette.primary.main, theme.palette.mode === 'light' ? 0.08 : 0.15),
            transform: "translateX(4px)",
            "& .MuiListItemIcon-root": { color: "primary.main" }
          },
          "&.Mui-selected": {
            backgroundColor: (theme) => theme.palette.mode === 'light' ? "primary.main" : "primary.dark",
            color: "white",
            fontWeight: 600,
            boxShadow: "0 2px 8px rgba(25, 118, 210, 0.3)",
            "&:hover": {
              backgroundColor: (theme) => theme.palette.mode === 'light' ? "primary.dark" : "primary.main",
            },
            "& .MuiListItemIcon-root": { color: "white" },
            "& .MuiListItemText-primary": { color: "white" }
          }
        }}
      >
        <ListItemIcon sx={{ minWidth: 32, color: "primary.main" }}>
          {open ? <FolderOpenIcon fontSize="small" /> : <FolderIcon fontSize="small" />}
        </ListItemIcon>
        <ListItemText
          primary={node.title || "Untitled Folder"}
          primaryTypographyProps={{
            variant: "body2",
            fontWeight: selectedId === node.id ? 600 : 500,
            noWrap: true
          }}
        />
        {hasChildren && (
          <Box onClick={handleToggle} sx={{ display: "flex", alignItems: "center", ml: 1 }}>
            {open ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
          </Box>
        )}
      </ListItemButton>

      {showContextMenu && (
        <ContextMenu
          open={contextMenu !== null}
          anchorPosition={contextMenu ? { top: contextMenu.mouseY, left: contextMenu.mouseX } : null}
          onClose={handleCloseContextMenu}
          items={contextMenuItems}
        />
      )}

      {hasChildren && (
        <Collapse in={open} timeout="auto" unmountOnExit>
          <List component="div" disablePadding>
            {node.children!
              .filter((child: BookmarkTreeNode) => !child.url)
              .map((child: BookmarkTreeNode) => (
                <TreeItem
                  key={child.id}
                  node={child}
                  level={level + 1}
                  selectedId={selectedId}
                  expandedIds={expandedIds}
                  onSelect={onSelect}
                  onToggle={onToggle}
                  isFavorite={false} // Will inherit logic if needed, but not required deeply
                  showContextMenu={showContextMenu}
                  onShowBookmarks={onShowBookmarks}
                  onForceFetchThumbs={onForceFetchThumbs}
                  onToggleFavorite={onToggleFavorite}
                />
              ))}
          </List>
        </Collapse>
      )}
    </>
  );
};

export const SharedFolderTree: React.FC<SharedFolderTreeProps> = ({
  bookmarkTree,
  matchedBookmarks,
  selectedFolderId,
  setSelectedFolderId,
  expandedFolderIds,
  setExpandedFolderIds,
  setting,
  bookmarkMap,
  showContextMenu,
  onForceFetchThumbnails,
  onToggleFavoriteFolder,
  onSetFavoriteFolderAlias,
  onGetAllBookmarksInFolder,
}) => {
  const favoriteFolderIds = setting.favoriteFolderIds || [];
  const favoriteFolderAliases = setting.favoriteFolderAliases || {};

  const [favoritesExpanded, setFavoritesExpanded] = useState(true);

  const [favContextMenu, setFavContextMenu] = useState<{
    mouseX: number;
    mouseY: number;
    folderId: string;
  } | null>(null);

  const handleFavContextMenu = (event: React.MouseEvent, id: string) => {
    if (!showContextMenu) return;
    event.preventDefault();
    event.stopPropagation();
    setFavContextMenu(
      favContextMenu === null
        ? { mouseX: event.clientX + 2, mouseY: event.clientY - 6, folderId: id }
        : null
    );
  };

  const handleFavContextMenuClose = () => {
    setFavContextMenu(null);
  };

  const handleFavRename = () => {
    if (!favContextMenu || !onSetFavoriteFolderAlias) return;
    const id = favContextMenu.folderId;
    const folder = bookmarkMap[id];
    if (!folder) return;

    const currentAlias = favoriteFolderAliases[id] || folder.title || "";
    const newAlias = window.prompt("Enter a new alias for this favorite (leave blank to reset):", currentAlias);

    if (newAlias !== null) {
      onSetFavoriteFolderAlias(id, newAlias.trim());
    }
    handleFavContextMenuClose();
  };

  const handleFavRemove = () => {
    if (!favContextMenu || !onToggleFavoriteFolder) return;
    onToggleFavoriteFolder(favContextMenu.folderId);
    handleFavContextMenuClose();
  };

  const handleFavShowBookmarks = () => {
    if (!favContextMenu) return;
    setSelectedFolderId(favContextMenu.folderId);
    handleFavContextMenuClose();
  };

  const expandedIdsSet = useMemo(() => new Set(expandedFolderIds), [expandedFolderIds]);

  const handleToggle = (id: string, expanded: boolean) => {
    const newIds = new Set(expandedFolderIds);
    if (expanded) newIds.add(id);
    else newIds.delete(id);
    setExpandedFolderIds(Array.from(newIds));
  };

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

    matchedBookmarks.forEach(bk => {
      let currentId = parentMap[bk.id];
      while (currentId) {
        ids.add(currentId);
        currentId = parentMap[currentId];
      }
    });

    return ids;
  }, [bookmarkTree, matchedBookmarks]);

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
    <List sx={{ width: "100%", bgcolor: "transparent" }} component="nav">
      <ListItemButton
        selected={selectedFolderId === "all"}
        onClick={() => setSelectedFolderId("all")}
        sx={{
          py: 1,
          borderRadius: 2,
          mb: 1,
          transition: "all 0.2s ease",
          "&:hover": {
            backgroundColor: (theme) => alpha(theme.palette.primary.main, theme.palette.mode === 'light' ? 0.08 : 0.15),
            transform: "translateX(4px)",
            "& .MuiListItemIcon-root": { color: "primary.main" }
          },
          "&.Mui-selected": {
            backgroundColor: (theme) => theme.palette.mode === 'light' ? "primary.main" : "primary.dark",
            color: "white",
            fontWeight: 600,
            boxShadow: "0 2px 8px rgba(25, 118, 210, 0.3)",
            "&:hover": {
              backgroundColor: (theme) => theme.palette.mode === 'light' ? "primary.dark" : "primary.main",
            },
            "& .MuiListItemIcon-root": { color: "white" },
            "& .MuiListItemText-primary": { color: "white" }
          }
        }}
      >
        <ListItemIcon sx={{ minWidth: 32, color: "primary.main" }}>
          <AllInclusiveIcon fontSize="small" />
        </ListItemIcon>
        <ListItemText primary="All Bookmarks" primaryTypographyProps={{ variant: "body2", fontWeight: selectedFolderId === "all" ? 600 : 500 }} />
      </ListItemButton>

      {favoriteFolderIds.length > 0 && (
        <Box sx={{ mb: 2 }}>
          <ListItemButton
            onClick={() => setFavoritesExpanded(!favoritesExpanded)}
            sx={{ px: 2, py: 0.5, "&:hover": { backgroundColor: "transparent" } }}
          >
            <Typography variant="overline" sx={{ color: "text.secondary", fontWeight: 600, display: "block", flexGrow: 1 }}>
              FAVORITES
            </Typography>
            {favoritesExpanded ? <ExpandLess fontSize="small" sx={{ color: "text.secondary" }} /> : <ExpandMore fontSize="small" sx={{ color: "text.secondary" }} />}
          </ListItemButton>
          <Collapse in={favoritesExpanded} timeout="auto" unmountOnExit>
            <List component="div" disablePadding>
              {favoriteFolderIds.map((id) => {
                const folder = bookmarkMap[id];
                if (!folder) return null;
                const displayName = favoriteFolderAliases[id] || folder.title || "Untitled Folder";
                return (
                  <ListItemButton
                    key={`fav-${id}`}
                    selected={selectedFolderId === id}
                    onClick={() => setSelectedFolderId(id)}
                    onContextMenu={(e) => handleFavContextMenu(e, id)}
                    sx={{
                      py: 1,
                      borderRadius: 2,
                      mb: 0.5,
                      transition: "all 0.2s ease",
                      "&:hover": {
                        backgroundColor: (theme) => alpha(theme.palette.warning.main, theme.palette.mode === 'light' ? 0.08 : 0.15),
                        transform: "translateX(4px)",
                        "& .MuiListItemIcon-root": { color: "warning.main" }
                      },
                      "&.Mui-selected": {
                        backgroundColor: (theme) => theme.palette.mode === 'light' ? "warning.main" : "warning.dark",
                        color: "white",
                        fontWeight: 600,
                        boxShadow: "0 2px 8px rgba(237, 108, 2, 0.3)",
                        "&:hover": {
                          backgroundColor: (theme) => theme.palette.mode === 'light' ? "warning.dark" : "warning.main",
                        },
                        "& .MuiListItemIcon-root": { color: "white" },
                        "& .MuiListItemText-primary": { color: "white" }
                      }
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 32, color: "warning.main" }}>
                      <StarIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText primary={displayName} primaryTypographyProps={{ variant: "body2", fontWeight: selectedFolderId === id ? 600 : 500, noWrap: true }} />
                  </ListItemButton>
                );
              })}
            </List>
          </Collapse>
        </Box>
      )}

      <Typography variant="overline" sx={{ px: 2, color: "text.secondary", fontWeight: 600, display: "block", mb: 0.5 }}>
        FOLDERS
      </Typography>

      {filteredTree && filteredTree.children && filteredTree.children
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
            isFavorite={favoriteFolderIds.includes(child.id)}
            showContextMenu={showContextMenu}
            onShowBookmarks={(id) => setSelectedFolderId(id)}
            onForceFetchThumbs={(id) => {
              if (onGetAllBookmarksInFolder && onForceFetchThumbnails) {
                const bookmarks = onGetAllBookmarksInFolder(id);
                if (bookmarks.length > 0) onForceFetchThumbnails(bookmarks.map(bk => bk.id));
              }
            }}
            onToggleFavorite={onToggleFavoriteFolder}
          />
        ))}

      {showContextMenu && (
        <Menu
          open={favContextMenu !== null}
          onClose={handleFavContextMenuClose}
          anchorReference="anchorPosition"
          anchorPosition={favContextMenu !== null ? { top: favContextMenu.mouseY, left: favContextMenu.mouseX } : undefined}
          PaperProps={{
            sx: {
              borderRadius: 2,
              minWidth: 160,
              boxShadow: "0 8px 16px rgba(0,0,0,0.1)",
              "& .MuiMenuItem-root": { px: 2, py: 1.5, gap: 1.5, "& .MuiListItemIcon-root": { minWidth: 24 } }
            }
          }}
        >
          <MenuItem onClick={handleFavShowBookmarks}>
            <ListItemIcon><VisibilityIcon fontSize="small" /></ListItemIcon>
            <ListItemText primary="Show Bookmarks" primaryTypographyProps={{ variant: "body2", fontWeight: 500 }} />
          </MenuItem>
          <MenuItem onClick={handleFavRename}>
            <ListItemIcon><EditIcon fontSize="small" /></ListItemIcon>
            <ListItemText primary="Edit Alias" primaryTypographyProps={{ variant: "body2", fontWeight: 500 }} />
          </MenuItem>
          <Divider sx={{ my: 0.5 }} />
          <MenuItem onClick={handleFavRemove} sx={{ color: "error.main", "& .MuiListItemIcon-root": { color: "error.main" } }}>
            <ListItemIcon><DeleteOutlineIcon fontSize="small" /></ListItemIcon>
            <ListItemText primary="Remove from Favorites" primaryTypographyProps={{ variant: "body2", fontWeight: 500 }} />
          </MenuItem>
        </Menu>
      )}
    </List>
  );
};
