import React, { useState, useEffect } from "react";
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    Stack,
    Typography,
    InputAdornment,
    Box,
    Switch,
    FormControlLabel,
    Collapse,
    Divider,
} from "@mui/material";
import { useStore } from "../store";

interface FetchSettingsDialogProps {
    open: boolean;
    onClose: () => void;
}

export function FetchSettingsDialog({ open, onClose }: FetchSettingsDialogProps) {
    const setting = useStore((state) => state.setting);
    const setSetting = useStore((state) => state.setSetting);

    const [pageModeConcurrency, setPageModeConcurrency] = useState<number>(setting.pageModeConcurrency || 1);
    const [fastModeConcurrency, setFastModeConcurrency] = useState<number>(setting.fastModeConcurrency || 3);
    const [enableDelay, setEnableDelay] = useState<boolean>(setting.enableDelay ?? false);
    const [delayCount, setDelayCount] = useState<number>(setting.fetchDelayCount || 5);
    const [delayTimeMin, setDelayTimeMin] = useState<number>(setting.fetchDelayTimeMin || 1000);
    const [delayTimeMax, setDelayTimeMax] = useState<number>(setting.fetchDelayTimeMax || 3000);
    const [keepTabsOpen, setKeepTabsOpen] = useState<boolean>(setting.keepTabsOpen || false);
    const [videoFetchChunkSize, setVideoFetchChunkSize] = useState<number>(setting.videoFetchChunkSize || 1.5);
    const [videoFetchMaxRetries, setVideoFetchMaxRetries] = useState<number>(setting.videoFetchMaxRetries || 3);

    useEffect(() => {
        if (open) {
            setPageModeConcurrency(setting.pageModeConcurrency || 1);
            setFastModeConcurrency(setting.fastModeConcurrency || 3);
            setEnableDelay(setting.enableDelay ?? false);
            setDelayCount(setting.fetchDelayCount || 5);
            setDelayTimeMin(setting.fetchDelayTimeMin || 1000);
            setDelayTimeMax(setting.fetchDelayTimeMax || 3000);
            setKeepTabsOpen(setting.keepTabsOpen || false);
            setVideoFetchChunkSize(setting.videoFetchChunkSize || 1.5);
            setVideoFetchMaxRetries(setting.videoFetchMaxRetries || 3);
        }
    }, [open, setting]);

    const handleSave = async () => {
        await setSetting({
            pageModeConcurrency: Math.max(1, Math.min(5, pageModeConcurrency)),
            fastModeConcurrency: Math.max(1, Math.min(10, fastModeConcurrency)),
            enableDelay,
            fetchDelayCount: delayCount,
            fetchDelayTimeMin: delayTimeMin,
            fetchDelayTimeMax: delayTimeMax,
            keepTabsOpen,
            videoFetchChunkSize: Math.max(0.1, videoFetchChunkSize),
            videoFetchMaxRetries: Math.max(0, videoFetchMaxRetries),
        });
        onClose();
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
            <DialogTitle sx={{ fontWeight: 700 }}>Fetch Settings</DialogTitle>
            <DialogContent>
                <Stack spacing={2.5} sx={{ mt: 1 }}>
                    {/* Concurrency Settings */}
                    <Box>
                        <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1.5 }}>
                            Concurrency
                        </Typography>
                        <Stack spacing={2}>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <Box>
                                    <Typography variant="body2" fontWeight={500}>Page Mode: Concurrent Tabs</Typography>
                                    <Typography variant="caption" color="text.secondary">Tabs open simultaneously (1-5)</Typography>
                                </Box>
                                <TextField
                                    type="number"
                                    value={pageModeConcurrency}
                                    onChange={(e) => setPageModeConcurrency(Number(e.target.value))}
                                    size="small"
                                    inputProps={{ min: 1, max: 5 }}
                                    sx={{ width: 72 }}
                                />
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <Box>
                                    <Typography variant="body2" fontWeight={500}>Fast Mode: Concurrent Requests</Typography>
                                    <Typography variant="caption" color="text.secondary">Parallel HTTP requests (1-10)</Typography>
                                </Box>
                                <TextField
                                    type="number"
                                    value={fastModeConcurrency}
                                    onChange={(e) => setFastModeConcurrency(Number(e.target.value))}
                                    size="small"
                                    inputProps={{ min: 1, max: 10 }}
                                    sx={{ width: 72 }}
                                />
                            </Box>
                        </Stack>
                    </Box>

                    <Divider />

                    {/* Video Frame Extraction */}
                    <Box>
                        <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1.5 }}>
                            Video Frame Extraction
                        </Typography>
                        <Stack spacing={2}>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <Box>
                                    <Typography variant="body2" fontWeight={500}>Chunk Size (MB)</Typography>
                                    <Typography variant="caption" color="text.secondary">Initial and incremental fetch size</Typography>
                                </Box>
                                <TextField
                                    type="number"
                                    value={videoFetchChunkSize}
                                    onChange={(e) => setVideoFetchChunkSize(Number(e.target.value))}
                                    size="small"
                                    inputProps={{ min: 0.1, step: 0.1 }}
                                    sx={{ width: 72 }}
                                />
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <Box>
                                    <Typography variant="body2" fontWeight={500}>Max Retries</Typography>
                                    <Typography variant="caption" color="text.secondary">Additional chunks to fetch if needed</Typography>
                                </Box>
                                <TextField
                                    type="number"
                                    value={videoFetchMaxRetries}
                                    onChange={(e) => setVideoFetchMaxRetries(Number(e.target.value))}
                                    size="small"
                                    inputProps={{ min: 0 }}
                                    sx={{ width: 72 }}
                                />
                            </Box>
                        </Stack>
                    </Box>

                    <Divider />

                    {/* Delay Control */}
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Box>
                            <Typography variant="subtitle2" fontWeight={600}>
                                Delay Control (Fast Mode Only)
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                Periodically pause fast mode to avoid detection
                            </Typography>
                        </Box>
                        <Switch
                            checked={enableDelay}
                            onChange={(e) => setEnableDelay(e.target.checked)}
                            color="primary"
                        />
                    </Box>

                    <Collapse in={enableDelay}>
                        <Stack spacing={3}>
                            <Box>
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                                    Pause after every N items. Only applies to Fast Mode.
                                </Typography>
                                <TextField
                                    fullWidth
                                    label="Fetch count before delay"
                                    type="number"
                                    value={delayCount}
                                    onChange={(e) => setDelayCount(Number(e.target.value))}
                                    size="small"
                                    inputProps={{ min: 1 }}
                                />
                            </Box>

                            <Box sx={{ display: 'flex', gap: 2 }}>
                                <TextField
                                    fullWidth
                                    label="Min Delay"
                                    type="number"
                                    value={delayTimeMin}
                                    onChange={(e) => setDelayTimeMin(Number(e.target.value))}
                                    size="small"
                                    InputProps={{
                                        endAdornment: <InputAdornment position="end">ms</InputAdornment>,
                                    }}
                                    inputProps={{ min: 0 }}
                                />
                                <TextField
                                    fullWidth
                                    label="Max Delay"
                                    type="number"
                                    value={delayTimeMax}
                                    onChange={(e) => setDelayTimeMax(Number(e.target.value))}
                                    size="small"
                                    InputProps={{
                                        endAdornment: <InputAdornment position="end">ms</InputAdornment>,
                                    }}
                                    inputProps={{ min: 0 }}
                                />
                            </Box>
                            {delayTimeMin > delayTimeMax && (
                                <Typography variant="caption" color="error">
                                    Min delay cannot be greater than Max delay.
                                </Typography>
                            )}
                        </Stack>
                    </Collapse>
                </Stack>

                <Box sx={{ mt: 3, pt: 3, borderTop: 1, borderColor: 'divider' }}>
                    <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
                        Debug
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Box>
                            <Typography variant="body2" fontWeight={500}>
                                Keep Tabs Open
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                Do not automatically close pages when fetching covers
                            </Typography>
                        </Box>
                        <Switch
                            checked={keepTabsOpen}
                            onChange={(e) => setKeepTabsOpen(e.target.checked)}
                            color="secondary"
                        />
                    </Box>
                </Box>
            </DialogContent>
            <DialogActions sx={{ p: 2.5 }}>
                <Button onClick={onClose} color="inherit">Cancel</Button>
                <Button
                    onClick={handleSave}
                    variant="contained"
                    disabled={enableDelay && delayTimeMin > delayTimeMax}
                >
                    Save Changes
                </Button>
            </DialogActions>
        </Dialog>
    );
}
