const fs = require('fs');

const popupCardCode = `import React from "react";
import { Box, Typography, Skeleton } from "@mui/material";
import { alpha } from "@mui/material/styles";
import LanguageIcon from "@mui/icons-material/Language";
import { usePopupStore } from "../store";
import { BookmarkCardBase } from "../../global/components/BookmarkCardBase";

interface PopupBookmarkCardProps {
  bookmarkId: string;
  title: string;
  url: string;
}

export const PopupBookmarkCard: React.FC<PopupBookmarkCardProps> = React.memo(
  ({ bookmarkId, title, url }) => {
    const image = usePopupStore((s) => s.loadedImageMap[bookmarkId]);

    return (
      <BookmarkCardBase
        url={url}
        image={image}
        renderCard={({ isInView, cardRef, hostname }) => (
          <Box
            ref={cardRef}
            component="a"
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            sx={{
              display: "flex",
              flexDirection: "row",
              alignItems: "stretch",
              textDecoration: "none",
              color: "inherit",
              borderRadius: 2,
              overflow: "hidden",
              mb: 1,
              border: "1px solid",
              borderColor: "divider",
              backgroundColor: "background.paper",
              transition: "all 0.15s ease",
              "&:hover": {
                borderColor: "primary.main",
                boxShadow: (theme) =>
                  theme.palette.mode === "light"
                    ? "0 4px 12px rgba(25,118,210,0.12)"
                    : "0 4px 12px rgba(0,0,0,0.3)",
                transform: "translateY(-1px)",
              },
            }}
          >
            {/* Image Section */}
            <Box
              sx={{
                width: 90,
                minWidth: 90,
                height: 64,
                flexShrink: 0,
                overflow: "hidden",
                backgroundColor: "grey.100",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {isInView ? (
                image ? (
                  <Box
                    component="img"
                    src={image}
                    alt={title}
                    sx={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                ) : (
                  <Box
                    sx={{
                      width: "100%",
                      height: "100%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      bgcolor: (theme) => alpha(theme.palette.grey[200], 0.8),
                    }}
                  >
                    <LanguageIcon sx={{ fontSize: 22, color: "grey.400" }} />
                  </Box>
                )
              ) : (
                <Skeleton variant="rectangular" width="100%" height="100%" />
              )}
            </Box>

            {/* Content Section */}
            <Box
              sx={{
                flex: 1,
                px: 1.5,
                py: 1,
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                minWidth: 0,
              }}
            >
              <Typography
                variant="body2"
                sx={{
                  fontWeight: 600,
                  fontSize: "0.8rem",
                  lineHeight: 1.3,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  color: "text.primary",
                }}
              >
                {title}
              </Typography>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 0.5,
                  mt: 0.5,
                  color: "text.secondary",
                }}
              >
                <LanguageIcon sx={{ fontSize: 11 }} />
                <Typography
                  variant="caption"
                  sx={{ fontSize: "0.68rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                >
                  {hostname}
                </Typography>
              </Box>
            </Box>
          </Box>
        )}
      />
    );
  }
);
`;
fs.writeFileSync('entrypoints/popup/Components/PopupBookmarkCard.tsx', popupCardCode);
