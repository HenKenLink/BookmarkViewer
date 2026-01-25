import { Card, Box } from "@mui/material";
import { styled } from "@mui/material/styles";

const spacingSizeStyle = {
  maxWidth: 800,
  margin: "20px auto",
};

// 使用styled创建样式化的Card组件
export const CardItem = styled(Card)(({ theme }) => ({
  display: "flex",
  ...spacingSizeStyle,
  boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
  borderRadius: 12,
  overflow: "hidden",
  transition: "transform 0.2s ease-in-out",
  "&:hover": {
    transform: "translateY(-2px)",
    boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
  },
}));

export const BoxItem = styled(Box)(({ theme }) => ({
  display: "flex",
  ...spacingSizeStyle,
}));
