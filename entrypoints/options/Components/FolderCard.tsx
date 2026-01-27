import React from "react";
import {
    Typography,
    Box,
    IconButton,
} from "@mui/material";
import { styled, alpha } from "@mui/material/styles";
import FolderRoundedIcon from "@mui/icons-material/FolderRounded";
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";
import { CardItem } from "./PageItem";

interface FolderCardProps {
    title: string;
    onClick: () => void;
    itemCount?: number;
}

const FolderIconContainer = styled(Box)(({ theme }) => ({
    width: 60,
    minWidth: 60,
    height: 60,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: `linear-gradient(135deg, ${theme.palette.primary.light} 0%, ${alpha(theme.palette.primary.main, 0.2)} 100%)`,
    color: theme.palette.primary.main,
    borderRadius: 12,
    margin: "12px 0 12px 16px",
    [theme.breakpoints.down("sm")]: {
        width: 48,
        minWidth: 48,
        height: 48,
        margin: "8px 0 8px 12px",
    },
}));

const ContentArea = styled(Box)({
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flex: 1,
    padding: "8px 24px",
});

export const FolderCard: React.FC<FolderCardProps> = ({
    title,
    onClick,
    itemCount,
}) => {
    return (
        <CardItem
            onClick={(e) => {
                e.preventDefault();
                onClick();
            }}
            sx={{
                p: 0,
                display: "flex",
                flexDirection: "row",
                alignItems: "center",
                mb: 2,
                minHeight: 84,
                overflow: "hidden",
                cursor: "pointer",
                transition: "all 0.2s ease",
                "&:hover": {
                    transform: "translateY(-2px)",
                    boxShadow: (theme) => theme.shadows[4],
                    borderColor: "primary.main",
                    "& .folder-arrow": {
                        transform: "translateX(4px)",
                        color: "primary.main",
                    }
                },
            }}
        >
            <FolderIconContainer>
                <FolderRoundedIcon sx={{ fontSize: { xs: 28, sm: 32 } }} />
            </FolderIconContainer>

            <ContentArea>
                <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                    <Typography
                        variant="h6"
                        sx={{
                            fontWeight: 600,
                            fontSize: "1.1rem",
                            lineHeight: 1.2,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                        }}
                    >
                        {title}
                    </Typography>
                    {itemCount !== undefined && (
                        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
                            {itemCount} matched items
                        </Typography>
                    )}
                </Box>
                <IconButton size="small" className="folder-arrow" sx={{ transition: "all 0.2s ease", ml: 2 }}>
                    <ArrowForwardIosIcon fontSize="inherit" sx={{ fontSize: 14 }} />
                </IconButton>
            </ContentArea>
        </CardItem>
    );
};
