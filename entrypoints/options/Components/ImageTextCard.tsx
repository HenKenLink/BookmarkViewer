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
} from "@mui/material";
import { styled } from "@mui/material/styles";
import { useState, useRef, useEffect } from "react";

import { CardItem } from "./PageItem";

// // 定义数据项的类型接口
// interface CardItem {
//   image?: string;
//   title: string;
//   url: string;
//   tags?: string[];
// }

// 定义ImageTextCard组件的props类型
interface ImageTextCardProps {
  image?: string | null;
  title: string;
  url: string;
  tags?: string[];
}

// 使用styled创建样式化的CardMedia组件
const StyledCardMedia = styled(CardMedia)({
  width: 300,
  height: 200,
  objectFit: "cover",
});

// 使用styled创建内容区域组件
const ContentArea = styled(Box)({
  display: "flex",
  flexDirection: "column",
  flex: 1,
  padding: 20,
});

// ImageTextCard组件
export const ImageTextCard: React.FC<ImageTextCardProps> = ({
  image,
  title,
  url,
  tags = [],
}) => {
  return (
    <CardItem>
      {image ? (
        <Link
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          underline="none"
        >
          <StyledCardMedia
            component="img"
            image={image}
            alt={title}
            sx={{
              objectFit: "cover", // or 'contain'
            }}
          />
        </Link>
      ) : null}

      <ContentArea>
        <Tooltip title={title} arrow followCursor>
          <Typography className="card-title">{title}</Typography>
        </Tooltip>

        {tags.length > 0 && (
          <Stack direction="row" spacing={1} sx={{ marginBottom: 2 }}>
            {tags.map((tag: string, index: number) => (
              <Chip
                key={index}
                label={tag}
                size="small"
                variant="outlined"
                color="primary"
              />
            ))}
          </Stack>
        )}

        <Box sx={{ marginTop: "auto" }}>
          <Link
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            variant="body2"
            sx={{
              // color: "#1976d2",
              textDecoration: "none",
              "&:hover": {
                textDecoration: "underline",
              },
            }}
          >
            {url}
          </Link>
        </Box>
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
