import React from "react";
import {
    Paper,
    Box,
    Typography,
    Stack,
    Button,
    IconButton,
    Divider,
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import DownloadIcon from "@mui/icons-material/Download";
import CloseIcon from "@mui/icons-material/Close";
import { useStore } from "../store";

export const SelectionActionBar: React.FC = () => {
    const selectedBookmarkIds = useStore((state) => state.selectedBookmarkIds);
    const isSelectionMode = useStore((state) => state.isSelectionMode);
    const setIsSelectionMode = useStore((state) => state.setIsSelectionMode);
    const clearSelection = useStore((state) => state.clearSelection);
    const isFetching = useStore((state) => state.isFetching);
    const forceFetchThumbnails = useStore((state) => state.forceFetchThumbnails);
    const downloadMultipleThumbnailsAction = useStore((state) => state.downloadMultipleThumbnailsAction);

    if (!isSelectionMode) return null;

    const handleBatchFetchThumbs = async () => {
        if (selectedBookmarkIds.length > 0) {
            const loadedImageMap = useStore.getState().loadedImageMap;
            const hasAnyThumb = selectedBookmarkIds.some(id => !!loadedImageMap[id]);
            
            if (hasAnyThumb) {
                const confirmed = window.confirm("选中的书签中部分已有封面，是否强制重新获取？");
                if (!confirmed) return;
            }

            await forceFetchThumbnails(selectedBookmarkIds);
            clearSelection();
        }
    };

    const handleBatchDownloadThumbs = async () => {
        if (selectedBookmarkIds.length > 0) {
            try {
                await downloadMultipleThumbnailsAction(selectedBookmarkIds);
            } catch (error) {
                alert(String(error));
            }
        }
    };

    return (
        <Paper
            elevation={12}
            sx={{
                position: "fixed",
                bottom: 32,
                left: "50%",
                transform: "translateX(-50%)",
                px: 4,
                py: 1.5,
                borderRadius: 5,
                display: "flex",
                alignItems: "center",
                gap: 3,
                backgroundColor: "background.paper",
                border: "1px solid",
                borderColor: "primary.light",
                boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
                zIndex: 1000,
            }}
        >
            <Stack direction="row" alignItems="center" spacing={1.5}>
                <Box
                    sx={{
                        bgcolor: "primary.main",
                        color: "white",
                        px: 1.5,
                        py: 0.5,
                        borderRadius: 2,
                        fontSize: "0.875rem",
                        fontWeight: 600,
                    }}
                >
                    {selectedBookmarkIds.length}
                </Box>
                <Typography variant="body2" sx={{ fontWeight: 600, color: "text.primary" }}>
                    Selected
                </Typography>
            </Stack>

            <Divider orientation="vertical" flexItem />

            <Stack direction="row" spacing={1}>
                <Button
                    variant="contained"
                    size="small"
                    startIcon={<RefreshIcon />}
                    onClick={handleBatchFetchThumbs}
                    disabled={isFetching || selectedBookmarkIds.length === 0}
                    sx={{
                        boxShadow: "none",
                        "&:hover": { boxShadow: "none" },
                    }}
                >
                    Fetch
                </Button>
                <Button
                    variant="outlined"
                    size="small"
                    startIcon={<DownloadIcon />}
                    onClick={handleBatchDownloadThumbs}
                    disabled={selectedBookmarkIds.length === 0}
                >
                    Download
                </Button>
            </Stack>

            <Divider orientation="vertical" flexItem />

            <IconButton
                size="small"
                onClick={() => setIsSelectionMode(false)}
                sx={{
                    color: "text.secondary",
                    "&:hover": { color: "error.main", bgcolor: "error.lighter" },
                }}
            >
                <CloseIcon />
            </IconButton>
        </Paper>
    );
};
