import React, { useMemo } from "react";
import {
    List,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    Collapse,
    Box,
    alpha,
} from "@mui/material";
import FolderIcon from "@mui/icons-material/Folder";
import FolderOpenIcon from "@mui/icons-material/FolderOpen";
import ExpandLess from "@mui/icons-material/ExpandLess";
import ExpandMore from "@mui/icons-material/ExpandMore";
import AllInclusiveIcon from "@mui/icons-material/AllInclusive";
import { BookmarkTreeNode } from "../../global/types";
import { useStore } from "../store";

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
        </List>
    );
};
