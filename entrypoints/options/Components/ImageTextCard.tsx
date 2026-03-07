import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardMedia,
  Typography,
  Box,
  Link,
  Chip,
  Stack,
  Tooltip,
  IconButton,
  Skeleton,
  Checkbox,
} from "@mui/material";
import { styled, alpha } from "@mui/material/styles";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import LanguageIcon from "@mui/icons-material/Language";
import RefreshIcon from "@mui/icons-material/Refresh";
import DownloadIcon from "@mui/icons-material/Download";
import UploadIcon from "@mui/icons-material/Upload";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";

import { CardItem } from "./PageItem";
import { ContextMenu, ContextMenuItem } from "./ContextMenu";
import { useStore } from "../store";

// 定义ImageTextCard组件的props类型
interface ImageTextCardProps {
  bookmarkId: string;
  // image prop removed, using store subscription
  title: string;
  url: string;
  tags?: string[];
}

// 使用styled创建样式化的CardMedia组件
const ImageContainer = styled(Box)(({ theme }) => ({
  width: 280,
  minWidth: 280,
  height: 180,
  position: "relative",
  overflow: "hidden",
  [theme.breakpoints.down("sm")]: {
    width: "100%",
    height: 200,
  },
}));

const StyledCardMedia = styled(CardMedia)({
  width: "100%",
  height: "100%",
  objectFit: "cover",
  transition: "transform 0.5s ease",
  "&:hover": {
    transform: "scale(1.05)",
  },
}) as typeof CardMedia;

// 使用styled创建内容区域组件
const ContentArea = styled(Box)({
  display: "flex",
  flexDirection: "column",
  justifyContent: "space-between",
  flex: 1,
  padding: "20px 24px",
});

export const ImageTextCard: React.FC<ImageTextCardProps> = React.memo(({
  bookmarkId,
  title,
  url,
  tags = [],
}) => {
  const hostname = new URL(url).hostname;
  const [isInView, setIsInView] = React.useState(false);
  const cardRef = React.useRef<HTMLDivElement>(null);

  // Granular subscriptions to prevent unnecessary re-renders
  const isSelected = useStore((state) => state.selectedBookmarkIds.includes(bookmarkId));
  const isSelectionMode = useStore((state) => state.isSelectionMode);
  const image = useStore((state) => state.loadedImageMap[bookmarkId]);

  // Actions - these are stable reference from zustand
  const setIsSelectionMode = useStore((state) => state.setIsSelectionMode);
  const toggleBookmarkSelection = useStore((state) => state.toggleBookmarkSelection);
  const forceFetchThumbnails = useStore((state) => state.forceFetchThumbnails);
  const downloadThumbnail = useStore((state) => state.downloadThumbnail);
  const uploadThumbnail = useStore((state) => state.uploadThumbnail);

  const [contextMenu, setContextMenu] = React.useState<{ mouseX: number; mouseY: number } | null>(null);

  React.useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      {
        rootMargin: "200px", // Load slightly before it comes into view
        threshold: 0.01,
      }
    );

    if (cardRef.current) {
      observer.observe(cardRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu(
      contextMenu === null
        ? { mouseX: e.clientX, mouseY: e.clientY }
        : null
    );
  };

  const handleCloseContextMenu = () => {
    setContextMenu(null);
  };

  const handleFetchThumb = async () => {
    await forceFetchThumbnails([bookmarkId]);
  };

  const handleDownloadThumb = async () => {
    try {
      await downloadThumbnail(bookmarkId);
    } catch (error) {
      alert('No thumbnail available to download');
    }
  };

  const handleUploadThumb = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        try {
          await uploadThumbnail(bookmarkId, file);
        } catch (error) {
          alert('Failed to upload thumbnail');
        }
      }
    };
    input.click();
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    toggleBookmarkSelection(bookmarkId);
  };

  const handleCardClick = () => {
    if (isSelectionMode) {
      toggleBookmarkSelection(bookmarkId);
    }
  };

  const handleLinkClick = (e: React.MouseEvent) => {
    if (isSelectionMode) {
      e.preventDefault();
    }
  };

  const contextMenuItems: ContextMenuItem[] = [
    {
      label: "Fetch thumb",
      icon: <RefreshIcon fontSize="small" />,
      onClick: handleFetchThumb,
    },
    {
      label: "Download thumb",
      icon: <DownloadIcon fontSize="small" />,
      onClick: handleDownloadThumb,
      disabled: !image,
    },
    {
      label: "Upload thumb",
      icon: <UploadIcon fontSize="small" />,
      onClick: handleUploadThumb,
    },
    {
      label: "Select",
      icon: <CheckCircleIcon fontSize="small" />,
      onClick: () => {
        setIsSelectionMode(true);
        if (!isSelected) {
          toggleBookmarkSelection(bookmarkId);
        }
      },
    },
  ];

  return (
    <CardItem
      ref={cardRef}
      onClick={handleCardClick}
      onContextMenu={handleContextMenu}
      sx={{
        cursor: isSelectionMode ? "pointer" : "default",
        p: 0,
        display: "flex",
        flexDirection: { xs: "column", sm: "row" },
        alignItems: "stretch",
        mb: 3,
        overflow: "hidden",
        position: "relative",
        border: (isSelected && isSelectionMode) ? "2px solid" : "none",
        borderColor: "primary.main",
      }}
    >
      {/* Selection Checkbox */}
      {isSelectionMode && (
        <Box
          sx={{
            position: "absolute",
            top: 8,
            left: 8,
            zIndex: 2,
            backgroundColor: "rgba(255, 255, 255, 0.9)",
            borderRadius: "50%",
          }}
        >
          <Checkbox
            checked={isSelected}
            onChange={handleCheckboxChange}
            size="small"
            sx={{
              "&.Mui-checked": {
                color: "primary.main",
              },
            }}
          />
        </Box>
      )}

      <ContextMenu
        open={contextMenu !== null}
        anchorPosition={contextMenu ? { top: contextMenu.mouseY, left: contextMenu.mouseX } : null}
        onClose={handleCloseContextMenu}
        items={contextMenuItems}
      />

      {/* Image Section */}
      <ImageContainer>
        <Link
          href={url}
          onClick={handleLinkClick}
          target="_blank"
          rel="noopener noreferrer"
          underline="none"
        >
          {isInView ? (
            image ? (
              <StyledCardMedia
                component="img"
                image={image}
                alt={title}
              />
            ) : (
              <Box
                sx={{
                  width: "100%",
                  height: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: "grey.200",
                  color: "grey.500",
                }}
              >
                <Typography variant="body2">No Preview</Typography>
              </Box>
            )
          ) : (
            <Skeleton
              variant="rectangular"
              width="100%"
              height="100%"
              animation="wave"
              sx={{ bgcolor: (theme) => alpha(theme.palette.grey[200], 0.5) }}
            />
          )}
        </Link>
      </ImageContainer>

      {/* Content Section */}
      <ContentArea>
        <Box>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 2 }}>
            <Link
              href={url}
              onClick={handleLinkClick}
              target="_blank"
              rel="noopener noreferrer"
              underline="none"
              sx={{
                color: "text.primary",
                flexGrow: 1,
                "&:hover": { color: "primary.main" }
              }}
            >
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 600,
                  lineHeight: 1.3,
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden"
                }}
              >
                {title}
              </Typography>
            </Link>
            <IconButton
              size="small"
              component="a"
              href={url}
              onClick={handleLinkClick}
              target="_blank"
              sx={{ color: "grey.400", mt: -0.5 }}
            >
              <OpenInNewIcon fontSize="small" />
            </IconButton>
          </Box>

          <Tooltip title={url} arrow placement="bottom-start">
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mt: 1, color: "text.secondary", width: "fit-content", cursor: "help" }}>
              <LanguageIcon sx={{ fontSize: 14 }} />
              <Typography variant="caption" sx={{ fontWeight: 500 }}>
                {hostname}
              </Typography>
            </Box>
          </Tooltip>
        </Box>

        <Stack direction="row" spacing={1} sx={{ mt: 2, flexWrap: "wrap", gap: 1 }}>
          {tags.map((tag, index) => (
            <Chip
              key={index}
              label={tag}
              size="small"
              variant="outlined"
              color="primary"
              sx={{ borderRadius: "6px", fontWeight: 500 }}
            />
          ))}
        </Stack>
      </ContentArea>
    </CardItem>
  );
});

// // 示例数据
// const sampleData: CardItem[] = [
//   {
//     image:
//       "https://images.unsplash.com/photo-1551033406-611cf9a28f67?w=300&h=200&fit=crop",
//     title: "React 开发指南",
//     url: "https://reactjs.org/docs/getting-started.html",
//   },
//   {
//     image:
//       "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=300&h=200&fit=crop",
//     title: "Material-UI 设计系统",
//     url: "https://mui.com/getting-started/installation/",
//   },
//   {
//     image:
//       "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=300&h=200&fit=crop",
//     title: "现代 Web 开发",
//     url: "https://developer.mozilla.org/zh-CN/docs/Web",
//     tags: ["Web开发", "最佳实践", "性能优化"],
//   },
// ];

// // 主应用组件
// const App: React.FC = () => {
//   return (
//     <Box
//       sx={{
//         backgroundColor: "#f5f5f5",
//         minHeight: "100vh",
//         padding: 2,
//       }}
//     >
//       <Typography
//         variant="h3"
//         component="h1"
//         align="center"
//         gutterBottom
//         sx={{
//           marginBottom: 4,
//           color: "#333",
//           fontWeight: 700,
//         }}
//       >
//         图片文字卡片展示
//       </Typography>
//       {sampleData.map((item: CardItem, index: number) => (
//         <ImageTextCard
//           key={index}
//           image={item.image}
//           title={item.title}
//           url={item.url}
//           tags={item.tags ? item.tags : []}
//         />
//       ))}
//     </Box>
//   );
// };

// export default App;
