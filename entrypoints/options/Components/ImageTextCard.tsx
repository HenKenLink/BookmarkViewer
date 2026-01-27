import React from "react";
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
} from "@mui/material";
import { styled, alpha } from "@mui/material/styles";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import LanguageIcon from "@mui/icons-material/Language";

import { CardItem } from "./PageItem";

// 定义ImageTextCard组件的props类型
interface ImageTextCardProps {
  image?: string | null;
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

export const ImageTextCard: React.FC<ImageTextCardProps> = ({
  image,
  title,
  url,
  tags = [],
}) => {
  const hostname = new URL(url).hostname;
  const [isInView, setIsInView] = React.useState(false);
  const cardRef = React.useRef<HTMLDivElement>(null);

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

  return (
    <CardItem
      ref={cardRef}
      sx={{
        p: 0,
        display: "flex",
        flexDirection: { xs: "column", sm: "row" },
        alignItems: "stretch",
        mb: 3,
        overflow: "hidden",
      }}
    >
      {/* Image Section */}
      <ImageContainer>
        <Link
          href={url}
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
              variant="soft"
              color="primary"
              sx={{ borderRadius: "6px", fontWeight: 500 }}
            />
          ))}
        </Stack>
      </ContentArea>
    </CardItem>
  );
};

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
