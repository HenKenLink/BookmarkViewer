import React, { useState } from "react";
import {
  Box, IconButton, MenuItem, Tooltip, Popover, Divider,
  ToggleButton, ToggleButtonGroup, Typography, alpha,
} from "@mui/material";
import SortIcon from "@mui/icons-material/Sort";
import AbcIcon from "@mui/icons-material/Abc";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import VerticalAlignTopIcon from "@mui/icons-material/VerticalAlignTop";
import VerticalAlignBottomIcon from "@mui/icons-material/VerticalAlignBottom";
import UnfoldMoreIcon from "@mui/icons-material/UnfoldMore";
import CheckIcon from "@mui/icons-material/Check";

interface SortControlsProps {
  sortBy: "name" | "dateAdded";
  sortOrder: "asc" | "desc";
  foldersPosition: "top" | "bottom" | "mixed";
  onChange: (updates: Partial<{
    sortBy: "name" | "dateAdded";
    sortOrder: "asc" | "desc";
    foldersPosition: "top" | "bottom" | "mixed";
  }>) => void;
  size?: "small" | "medium";
}

const FOLDER_OPTS: { value: "top" | "bottom" | "mixed"; icon: React.ReactNode; label: string }[] = [
  { value: "top",    icon: <VerticalAlignTopIcon fontSize="small" />,    label: "Folders on top" },
  { value: "bottom", icon: <VerticalAlignBottomIcon fontSize="small" />, label: "Folders on bottom" },
  { value: "mixed",  icon: <UnfoldMoreIcon fontSize="small" />,          label: "Folders mixed in" },
];

export const SortControls: React.FC<SortControlsProps> = ({
  sortBy, sortOrder, foldersPosition, onChange, size = "small"
}) => {
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
  const open = Boolean(anchorEl);

  const isActive = true; // always show indicator since sorting is always applied

  const orderLabel = sortOrder === "asc" ? "Asc" : "Desc";
  const byLabel    = sortBy === "name" ? "Name" : "Date";

  return (
    <>
      <Tooltip title={`Sort: ${byLabel} · ${orderLabel}`}>
        <IconButton
          size={size}
          onClick={(e) => setAnchorEl(e.currentTarget)}
          sx={{
            borderRadius: 1.5,
            color: open ? "primary.main" : "text.secondary",
            bgcolor: open ? (theme) => alpha(theme.palette.primary.main, 0.08) : "transparent",
            "&:hover": { color: "primary.main" },
          }}
        >
          <SortIcon fontSize="small" />
        </IconButton>
      </Tooltip>

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        PaperProps={{
          sx: {
            mt: 0.5,
            p: 0,
            minWidth: 200,
            borderRadius: 2,
            boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
            overflow: "hidden",
          },
        }}
      >
        {/* Sort By */}
        <Box sx={{ px: 2, pt: 1.5, pb: 0.5 }}>
          <Typography variant="overline" sx={{ fontSize: "0.65rem", color: "text.secondary", fontWeight: 700 }}>
            Sort By
          </Typography>
        </Box>
        {(["name", "dateAdded"] as const).map((val) => {
          const icon = val === "name"
            ? <AbcIcon fontSize="small" sx={{ color: "text.secondary" }} />
            : <CalendarTodayIcon fontSize="small" sx={{ color: "text.secondary" }} />;
          const label = val === "name" ? "Name" : "Date Added";
          return (
            <MenuItem
              key={val}
              selected={sortBy === val}
              onClick={() => { onChange({ sortBy: val }); }}
              sx={{ gap: 1.5, py: 1, "&.Mui-selected": { color: "primary.main", fontWeight: 600 } }}
            >
              {icon}
              <Typography variant="body2">{label}</Typography>
              {sortBy === val && <CheckIcon fontSize="small" sx={{ ml: "auto", color: "primary.main" }} />}
            </MenuItem>
          );
        })}

        <Divider sx={{ my: 0.5 }} />

        {/* Order */}
        <Box sx={{ px: 2, pt: 0.5, pb: 0.5 }}>
          <Typography variant="overline" sx={{ fontSize: "0.65rem", color: "text.secondary", fontWeight: 700 }}>
            Order
          </Typography>
        </Box>
        {(["asc", "desc"] as const).map((val) => {
          const icon = val === "asc"
            ? <ArrowUpwardIcon fontSize="small" sx={{ color: "text.secondary" }} />
            : <ArrowDownwardIcon fontSize="small" sx={{ color: "text.secondary" }} />;
          const label = val === "asc" ? "Ascending" : "Descending";
          return (
            <MenuItem
              key={val}
              selected={sortOrder === val}
              onClick={() => { onChange({ sortOrder: val }); }}
              sx={{ gap: 1.5, py: 1, "&.Mui-selected": { color: "primary.main", fontWeight: 600 } }}
            >
              {icon}
              <Typography variant="body2">{label}</Typography>
              {sortOrder === val && <CheckIcon fontSize="small" sx={{ ml: "auto", color: "primary.main" }} />}
            </MenuItem>
          );
        })}

        <Divider sx={{ my: 0.5 }} />

        {/* Folders position */}
        <Box sx={{ px: 2, pt: 0.5, pb: 0.5 }}>
          <Typography variant="overline" sx={{ fontSize: "0.65rem", color: "text.secondary", fontWeight: 700 }}>
            Folders
          </Typography>
        </Box>
        {FOLDER_OPTS.map(({ value, icon, label }) => (
          <MenuItem
            key={value}
            selected={foldersPosition === value}
            onClick={() => { onChange({ foldersPosition: value }); }}
            sx={{ gap: 1.5, py: 1, "&.Mui-selected": { color: "primary.main", fontWeight: 600 } }}
          >
            <Box sx={{ color: "text.secondary" }}>{icon}</Box>
            <Typography variant="body2">{label}</Typography>
            {foldersPosition === value && <CheckIcon fontSize="small" sx={{ ml: "auto", color: "primary.main" }} />}
          </MenuItem>
        ))}

        <Box sx={{ pb: 0.5 }} />
      </Popover>
    </>
  );
};
