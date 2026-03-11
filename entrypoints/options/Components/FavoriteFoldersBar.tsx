import React, { useState, useRef, useEffect } from "react";
import { Box, Chip, IconButton } from "@mui/material";
import StarIcon from "@mui/icons-material/Star";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import { BookmarkTreeNode } from "../../global/types";

interface FavoriteFoldersBarProps {
  favoriteFolderIds: string[];
  bookmarkMap: Record<string, BookmarkTreeNode>;
  selectedFolderId: string;
  onSelect: (id: string) => void;
  aliases: Record<string, string>;
  sx?: object;
  chipSize?: "small" | "medium";
}

export function FavoriteFoldersBar({ favoriteFolderIds, bookmarkMap, selectedFolderId, onSelect, aliases, sx, chipSize = "medium" }: FavoriteFoldersBarProps) {
  const [expanded, setExpanded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isOverflowing, setIsOverflowing] = useState(false);

  useEffect(() => {
    // Check if the container is overflowing
    if (containerRef.current) {
      const isOverflow = containerRef.current.scrollWidth > containerRef.current.clientWidth;
      setIsOverflowing(isOverflow || expanded);
    }
  }, [favoriteFolderIds, expanded]);

  if (favoriteFolderIds.length === 0) return null;

  return (
    <Box sx={{ mb: 1.5, display: 'flex', alignItems: 'flex-start', gap: 1, px: 1.5, ...sx }}>
      <Box
        ref={containerRef}
        sx={{
          display: 'flex',
          flexWrap: expanded ? 'wrap' : 'nowrap',
          overflowX: expanded ? 'visible' : 'auto',
          overflowY: expanded ? 'visible' : 'hidden',
          gap: 1,
          flexGrow: 1,
          minWidth: 0, // Keeps flex item from ignoring container constraints
          height: expanded ? 'auto' : 32, // Fixed height for one line
          scrollbarWidth: 'none', // Firefox
          '&::-webkit-scrollbar': { display: 'none' }, // Chrome/Safari
          WebkitMaskImage: (!expanded && isOverflowing) ? 'linear-gradient(to right, black calc(100% - 24px), transparent 100%)' : 'none',
          maskImage: (!expanded && isOverflowing) ? 'linear-gradient(to right, black calc(100% - 24px), transparent 100%)' : 'none',
        }}
      >
        {favoriteFolderIds.map(id => {
          const folder = bookmarkMap[id];
          if (!folder) return null;
          return (
            <Chip
              key={`tag-${id}`}
              size={chipSize}
              icon={<StarIcon sx={{ fontSize: chipSize === "small" ? 14 : 18, color: selectedFolderId === id ? "white !important" : "warning.main" }} />}
              label={aliases[id] ? aliases[id] : folder.title || "Untitled"}
              onClick={() => onSelect(id)}
              color={selectedFolderId === id ? "warning" : "default"}
              sx={{
                fontWeight: selectedFolderId === id ? 600 : 400,
                flexShrink: 0,
                transition: "all 0.2s ease",
                "&:last-of-type": { marginRight: '24px' }, // Ensures it can be scrolled fully clear of the fading mask
                "&:hover": { boxShadow: "0 2px 4px rgba(0,0,0,0.1)" }
              }}
            />
          );
        })}
      </Box>
      {isOverflowing && (
        <IconButton size="small" onClick={() => setExpanded(!expanded)} sx={{ flexShrink: 0, mt: -0.5 }} title={expanded ? "Show less" : "Show more"}>
          {expanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
        </IconButton>
      )}
    </Box>
  );
}
