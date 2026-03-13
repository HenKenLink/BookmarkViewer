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
import DownloadIcon from "@mui/icons-material/Download";
import RefreshIcon from "@mui/icons-material/Refresh";
import StarIcon from "@mui/icons-material/Star";
import StarBorderIcon from "@mui/icons-material/StarBorder";
import { BookmarkTreeNode } from "../../global/types";
import { useStore } from "../store";
import { ContextMenu, ContextMenuItem } from "./ContextMenu";

interface FolderTreeProps {
    onSelect?: (id: string) => void;
}

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

    const setSelectedFolderId = useStore((state) => state.setSelectedFolderId);
    const getAllBookmarksInFolderAction = useStore((state) => state.getAllBookmarksInFolderAction);
    const forceFetchThumbnails = useStore((state) => state.forceFetchThumbnails);
    const setting = useStore((state) => state.setting);
    const toggleFavoriteFolder = useStore((state) => state.toggleFavoriteFolder);

    const isFavorite = (setting.favoriteFolderIds || []).includes(node.id);

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

    const handleShowBookmarks = () => {
        setSelectedFolderId(node.id);
    };

    const handleForceFetchThumbs = async () => {
        const bookmarks = getAllBookmarksInFolderAction(node.id);
        if (bookmarks.length > 0) {
            const loadedImageMap = useStore.getState().loadedImageMap;
            const hasAnyThumb = bookmarks.some(bk => !!loadedImageMap[bk.id]);
            
            if (hasAnyThumb) {
                const confirmed = window.confirm("该文件夹下部分书签已有封面，是否强制重新获取？");
                if (!confirmed) return;
            }

            await forceFetchThumbnails(bookmarks.map(bk => bk.id));
        }
    };

    const handleToggleFavorite = () => {
        toggleFavoriteFolder(node.id);
    };

    const contextMenuItems: ContextMenuItem[] = [
        {
            label: "Show bookmarks",
            icon: <VisibilityIcon fontSize="small" />,
            onClick: handleShowBookmarks,
        },
        {
            label: "Fetch thumbnails",
            icon: <RefreshIcon fontSize="small" />,
            onClick: handleForceFetchThumbs,
        },
        {
            label: isFavorite ? "Remove from Favorites" : "Add to Favorites",
            icon: isFavorite ? <StarIcon fontSize="small" sx={{ color: "warning.main" }} /> : <StarBorderIcon fontSize="small" />,
            onClick: handleToggleFavorite,
            divider: true
        },
    ];

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
                        "& .MuiListItemIcon-root": {
                            color: "primary.main",
                        }
                    },
                    "&.Mui-selected": {
                        backgroundColor: (theme) => theme.palette.mode === 'light'
                            ? "primary.main"
                            : "primary.dark",
                        color: "white",
                        fontWeight: 600,
                        boxShadow: "0 2px 8px rgba(25, 118, 210, 0.3)",
                        "&:hover": {
                            backgroundColor: (theme) => theme.palette.mode === 'light'
                                ? "primary.dark"
                                : "primary.main",
                        },
                        "& .MuiListItemIcon-root": {
                            color: "white",
                        },
                        "& .MuiListItemText-primary": {
                            color: "white",
                        }
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

            <ContextMenu
                open={contextMenu !== null}
                anchorPosition={contextMenu ? { top: contextMenu.mouseY, left: contextMenu.mouseX } : null}
                onClose={handleCloseContextMenu}
                items={contextMenuItems}
            />

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
                                />
                            ))}
                    </List>
                </Collapse>
            )}
        </>
    );
};

export const FolderTree: React.FC<FolderTreeProps> = () => {
    const bookmarkTree = useStore((state) => state.bookmarkTree);
    const matchedBookmarks = useStore((state) => state.matchedBookmarks);
    const selectedFolderId = useStore((state) => state.selectedFolderId);
    const setSelectedFolderId = useStore((state) => state.setSelectedFolderId);
    const expandedFolderIds = useStore((state) => state.expandedFolderIds);
    const setExpandedFolderIds = useStore((state) => state.setExpandedFolderIds);
    const setting = useStore((state) => state.setting);
    const bookmarkMap = useStore((state) => state.bookmarkMap);

    const favoriteFolderIds = setting.favoriteFolderIds || [];
    const favoriteFolderAliases = setting.favoriteFolderAliases || {};

    const [favoritesExpanded, setFavoritesExpanded] = useState(true);

    const [favContextMenu, setFavContextMenu] = useState<{
        mouseX: number;
        mouseY: number;
        folderId: string;
    } | null>(null);

    const handleFavContextMenu = (event: React.MouseEvent, id: string) => {
        event.preventDefault();
        event.stopPropagation();
        setFavContextMenu(
            favContextMenu === null
                ? {
                    mouseX: event.clientX + 2,
                    mouseY: event.clientY - 6,
                    folderId: id,
                }
                : null,
        );
    };

    const handleFavContextMenuClose = () => {
        setFavContextMenu(null);
    };

    const handleFavRename = () => {
        if (!favContextMenu) return;
        const id = favContextMenu.folderId;
        const folder = bookmarkMap[id];
        if (!folder) return;

        const currentAlias = favoriteFolderAliases[id] || folder.title || "";
        const newAlias = window.prompt("Enter a new alias for this favorite (leave blank to reset):", currentAlias);

        if (newAlias !== null) {
            useStore.getState().setFavoriteFolderAlias(id, newAlias.trim());
        }
        handleFavContextMenuClose();
    };

    const handleFavRemove = () => {
        if (!favContextMenu) return;
        useStore.getState().toggleFavoriteFolder(favContextMenu.folderId);
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
        if (expanded) {
            newIds.add(id);
        } else {
            newIds.delete(id);
        }
        setExpandedFolderIds(Array.from(newIds));
    };

    // 1. Identify all folder IDs that are ancestors of matched bookmarks
    const matchedFolderIds = useMemo(() => {
        const ids = new Set<string>();

        // Helper to find parent paths (this is tricky as BookmarkTreeNode doesn't have parent reference in this structure usually)
        // We can build a map of childId -> parentId first or search recursively
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

    // 2. Filter the tree to only include folders in matchedFolderIds
    const filteredTree = useMemo(() => {
        if (!bookmarkTree) return null;

        const filterNode = (node: BookmarkTreeNode): BookmarkTreeNode | null => {
            // If it's a bookmark (has url), we don't show it in the tree
            if (node.url) return null;

            // If it's a folder, check if it or any of its descendants are in matchedFolderIds
            const filteredChildren = node.children
                ? node.children
                    .map((child: BookmarkTreeNode) => filterNode(child))
                    .filter((child): child is BookmarkTreeNode => child !== null)
                : [];

            // A folder is kept if it's in matchedFolderIds or has kept children
            if (matchedFolderIds.has(node.id) || filteredChildren.length > 0) {
                return {
                    ...node,
                    children: filteredChildren
                };
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
                        "& .MuiListItemIcon-root": {
                            color: "primary.main",
                        }
                    },
                    "&.Mui-selected": {
                        backgroundColor: (theme) => theme.palette.mode === 'light'
                            ? "primary.main"
                            : "primary.dark",
                        color: "white",
                        fontWeight: 600,
                        boxShadow: "0 2px 8px rgba(25, 118, 210, 0.3)",
                        "&:hover": {
                            backgroundColor: (theme) => theme.palette.mode === 'light'
                                ? "primary.dark"
                                : "primary.main",
                        },
                        "& .MuiListItemIcon-root": {
                            color: "white",
                        },
                        "& .MuiListItemText-primary": {
                            color: "white",
                        }
                    }
                }}
            >
                <ListItemIcon sx={{ minWidth: 32, color: "primary.main" }}>
                    <AllInclusiveIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText
                    primary="All Bookmarks"
                    primaryTypographyProps={{
                        variant: "body2",
                        fontWeight: selectedFolderId === "all" ? 600 : 500
                    }}
                />
            </ListItemButton>

            {favoriteFolderIds.length > 0 && (
                <Box sx={{ mb: 2 }}>
                    <ListItemButton
                        onClick={() => setFavoritesExpanded(!favoritesExpanded)}
                        sx={{
                            px: 2,
                            py: 0.5,
                            "&:hover": { backgroundColor: "transparent" }
                        }}
                    >
                        <Typography
                            variant="overline"
                            sx={{ color: "text.secondary", fontWeight: 600, display: "block", flexGrow: 1 }}
                        >
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
                                                "& .MuiListItemIcon-root": {
                                                    color: "warning.main",
                                                }
                                            },
                                            "&.Mui-selected": {
                                                backgroundColor: (theme) => theme.palette.mode === 'light'
                                                    ? "warning.main"
                                                    : "warning.dark",
                                                color: "white",
                                                fontWeight: 600,
                                                boxShadow: "0 2px 8px rgba(237, 108, 2, 0.3)",
                                                "&:hover": {
                                                    backgroundColor: (theme) => theme.palette.mode === 'light'
                                                        ? "warning.dark"
                                                        : "warning.main",
                                                },
                                                "& .MuiListItemIcon-root": {
                                                    color: "white",
                                                },
                                                "& .MuiListItemText-primary": {
                                                    color: "white",
                                                }
                                            }
                                        }}
                                    >
                                        <ListItemIcon sx={{ minWidth: 32, color: "warning.main" }}>
                                            <StarIcon fontSize="small" />
                                        </ListItemIcon>
                                        <ListItemText
                                            primary={displayName}
                                            primaryTypographyProps={{
                                                variant: "body2",
                                                fontWeight: selectedFolderId === id ? 600 : 500,
                                                noWrap: true
                                            }}
                                        />
                                    </ListItemButton>
                                );
                            })}
                        </List>
                    </Collapse>
                </Box>
            )}

            <Typography
                variant="overline"
                sx={{ px: 2, color: "text.secondary", fontWeight: 600, display: "block", mb: 0.5 }}
            >
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
                    />
                ))}

            <Menu
                open={favContextMenu !== null}
                onClose={handleFavContextMenuClose}
                anchorReference="anchorPosition"
                anchorPosition={
                    favContextMenu !== null
                        ? { top: favContextMenu.mouseY, left: favContextMenu.mouseX }
                        : undefined
                }
                PaperProps={{
                    sx: {
                        borderRadius: 2,
                        minWidth: 160,
                        boxShadow: "0 8px 16px rgba(0,0,0,0.1)",
                        "& .MuiMenuItem-root": {
                            px: 2,
                            py: 1.5,
                            gap: 1.5,
                            "& .MuiListItemIcon-root": {
                                minWidth: 24,
                            }
                        }
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
        </List>
    );
};
