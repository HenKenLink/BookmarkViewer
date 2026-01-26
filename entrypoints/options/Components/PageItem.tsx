import { Card, Box } from "@mui/material";
import { styled } from "@mui/material/styles";

const spacingSizeStyle = {
  maxWidth: 1000,
  margin: "0 auto",
};

// 使用styled创建样式化的Card组件
export const CardItem = styled(Card)(({ theme }) => ({
  display: "flex",
  ...spacingSizeStyle,
  boxShadow: theme.palette.mode === "light"
    ? "0 1px 3px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.1)"
    : "0 4px 20px rgba(0,0,0,0.4)",
  borderRadius: 12,
  overflow: "hidden",
  transition: "all 0.2s ease-in-out",
  borderLeft: `6px solid ${theme.palette.primary.main}`,
  backgroundColor: theme.palette.background.paper,
  "&:hover": {
    transform: "translateY(-2px)",
    boxShadow: theme.palette.mode === "light"
      ? "0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)"
      : "0 12px 28px rgba(0,0,0,0.5)",
  },
}));

export const BoxItem = styled(Box)(({ theme }) => ({
  display: "flex",
  ...spacingSizeStyle,
  width: "100%",
}));
