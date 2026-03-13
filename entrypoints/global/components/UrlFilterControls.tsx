import React, { useState } from "react";
import {
  Box, Autocomplete, TextField, Chip, IconButton,
  Popover, Tooltip, Badge, Typography, alpha,
} from "@mui/material";
import FilterListIcon from "@mui/icons-material/FilterList";

interface UrlFilterControlsProps {
  urlFilters: string[];
  onChange: (filters: string[]) => void;
  size?: "small" | "medium";
}

export const UrlFilterControls: React.FC<UrlFilterControlsProps> = ({
  urlFilters, onChange, size = "small"
}) => {
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
  const open = Boolean(anchorEl);
  const active = urlFilters.length > 0;

  return (
    <>
      <Tooltip title={active ? `Domain filters: ${urlFilters.join(", ")}` : "Filter by domain"}>
        <IconButton
          size={size}
          onClick={(e) => setAnchorEl(e.currentTarget)}
          sx={{
            borderRadius: 1.5,
            color: active ? "primary.main" : (open ? "primary.main" : "text.secondary"),
            bgcolor: (active || open) ? (theme) => alpha(theme.palette.primary.main, 0.08) : "transparent",
            "&:hover": { color: "primary.main" },
          }}
        >
          <Badge
            variant="dot"
            color="primary"
            invisible={!active}
          >
            <FilterListIcon fontSize="small" />
          </Badge>
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
            p: 2,
            width: 300,
            borderRadius: 2,
            boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
          },
        }}
      >
        <Typography variant="overline" sx={{ fontSize: "0.65rem", color: "text.secondary", fontWeight: 700, display: "block", mb: 1 }}>
          Filter by Domain
        </Typography>
        <Autocomplete
          multiple
          freeSolo
          options={[] as string[]}
          value={urlFilters}
          onChange={(_, newValue) => onChange(newValue)}
          renderTags={(value: readonly string[], getTagProps) =>
            value.map((option: string, index: number) => {
              const { key, ...tagProps } = getTagProps({ index });
              return (
                <Chip
                  variant="outlined"
                  label={option}
                  size="small"
                  key={key}
                  {...tagProps}
                  sx={{ borderRadius: 1 }}
                />
              );
            })
          }
          renderInput={(params) => (
            <TextField
              {...params}
              variant="outlined"
              size="small"
              placeholder={urlFilters.length === 0 ? "e.g. github.com" : "Add another..."}
              helperText="Press Enter to add each domain"
            />
          )}
        />
      </Popover>
    </>
  );
};
