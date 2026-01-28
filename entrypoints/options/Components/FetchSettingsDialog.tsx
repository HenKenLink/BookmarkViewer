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
} from "@mui/material";
import { useStore } from "../store";

interface FetchSettingsDialogProps {
    open: boolean;
    onClose: () => void;
}

export function FetchSettingsDialog({ open, onClose }: FetchSettingsDialogProps) {
    const setting = useStore((state) => state.setting);
    const setSetting = useStore((state) => state.setSetting);

    const [enableDelay, setEnableDelay] = useState<boolean>(setting.enableDelay ?? true);
    const [delayCount, setDelayCount] = useState<number>(setting.fetchDelayCount || 5);
    const [delayTimeMin, setDelayTimeMin] = useState<number>(setting.fetchDelayTimeMin || 1000);
    const [delayTimeMax, setDelayTimeMax] = useState<number>(setting.fetchDelayTimeMax || 3000);

    useEffect(() => {
        if (open) {
            setEnableDelay(setting.enableDelay ?? true);
            setDelayCount(setting.fetchDelayCount || 5);
            setDelayTimeMin(setting.fetchDelayTimeMin || 1000);
            setDelayTimeMax(setting.fetchDelayTimeMax || 3000);
        }
    }, [open, setting]);

    const handleSave = async () => {
        await setSetting({
            enableDelay,
            fetchDelayCount: delayCount,
            fetchDelayTimeMin: delayTimeMin,
            fetchDelayTimeMax: delayTimeMax,
        });
        onClose();
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
            <DialogTitle sx={{ fontWeight: 700 }}>Fetch Settings</DialogTitle>
            <DialogContent>
                <Stack spacing={3} sx={{ mt: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Box>
                            <Typography variant="subtitle2" fontWeight={600}>
                                Delay Control
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                Pause fetching to avoid detection
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
                                    Pause fetching after every N items to avoid being detected as a crawler.
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
