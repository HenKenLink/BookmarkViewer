import React, { useRef, useState } from "react";
import {
    Container,
    Typography,
    Paper,
    Box,
    Switch,
    List,
    ListItem,
    ListItemText,
    ListItemSecondaryAction,
    Divider,
    Button,
    Stack,
    Checkbox,
    FormControlLabel,
    MenuItem,
    Select,
    SelectChangeEvent,
    Collapse,
    TextField,
} from "@mui/material";
import { useStore } from "../store";
import { exportAll, importFile } from "../utils/exportImport";
import DeleteForeverIcon from "@mui/icons-material/DeleteForever";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import DownloadIcon from "@mui/icons-material/Download";
import { PAGE_ITEM_SX } from "../consts";
import { LogLevel } from "../../global/types";

export function SettingsPage() {
    const setting = useStore((state) => state.setting);
    const setSetting = useStore((state) => state.setSetting);
    const bookmarkMap = useStore((state) => state.bookmarkMap);
    const clearAllCovers = useStore((state) => state.clearAllCovers);

    const fileInputRef = useRef<HTMLInputElement>(null);

    const toggleAnimations = async () => {
        await setSetting({ enableAnimations: !setting.enableAnimations });
    };

    const toggleDarkMode = async () => {
        await setSetting({ darkMode: !setting.darkMode });
    };

    const toggleShowFavoriteFolders = async () => {
        await setSetting({ showFavoriteFolders: !setting.showFavoriteFolders });
    };

    const handleLogLevelChange = async (event: SelectChangeEvent<LogLevel>) => {
        const newLevel = event.target.value as LogLevel;
        await setSetting({ logLevel: newLevel });
    };

    const handleExport = async () => {
        await exportAll();
    };

    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            await importFile(e.target.files[0], bookmarkMap, (msg) => alert(msg));
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    const handleClearCovers = async () => {
        if (confirm("Are you sure you want to clear ALL cached covers? This cannot be undone.")) {
            await clearAllCovers();
            alert("All covers have been cleared.");
        }
    };

    return (
        <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
            <Typography variant="h4" component="h1" gutterBottom sx={{ mb: 4, fontWeight: 'bold' }}>
                Settings
            </Typography>

            {/* General Settings */}
            <Paper sx={{ mb: 4, overflow: 'hidden' }} variant="outlined">
                <Box sx={{ p: 2, bgcolor: 'action.hover' }}>
                    <Typography variant="h6" component="h2">General</Typography>
                </Box>
                <Divider />
                <List disablePadding>
                    <ListItem>
                        <ListItemText
                            primary="Enable Animations"
                            secondary="Toggle UI animations and transitions"
                        />
                        <ListItemSecondaryAction>
                            <Switch
                                edge="end"
                                checked={!!setting.enableAnimations}
                                onChange={toggleAnimations}
                            />
                        </ListItemSecondaryAction>
                    </ListItem>
                    <Divider component="li" />
                    <ListItem>
                        <ListItemText
                            primary="Dark Mode"
                            secondary="Switch between light and dark themes"
                        />
                        <ListItemSecondaryAction>
                            <Switch
                                edge="end"
                                checked={!!setting.darkMode}
                                onChange={toggleDarkMode}
                            />
                        </ListItemSecondaryAction>
                    </ListItem>
                    <Divider component="li" />
                    <ListItem>
                        <ListItemText
                            primary="Show Favorite Folders Tag Bar"
                            secondary="Display a quick-access tag bar for favorite folders in the viewer"
                        />
                        <ListItemSecondaryAction>
                            <Switch
                                edge="end"
                                checked={!!setting.showFavoriteFolders}
                                onChange={toggleShowFavoriteFolders}
                            />
                        </ListItemSecondaryAction>
                    </ListItem>
                    <Divider component="li" />
                    <ListItem>
                        <ListItemText
                            primary="Extension Icon Click Action"
                            secondary="Choose what happens when you click the extension icon"
                        />
                        <ListItemSecondaryAction>
                            <Select
                                value={setting.clickAction || 'popup'}
                                onChange={async (e) => await setSetting({ clickAction: e.target.value as "popup" | "options" })}
                                size="small"
                                sx={{ minWidth: 120 }}
                            >
                                <MenuItem value="popup">Open Popup</MenuItem>
                                <MenuItem value="options">Open Viewer/Settings</MenuItem>
                            </Select>
                        </ListItemSecondaryAction>
                    </ListItem>
                </List>
            </Paper>

            {/* Fetch Settings */}
            <Paper sx={{ mb: 4, overflow: 'hidden' }} variant="outlined">
                <Box sx={{ p: 2, bgcolor: 'action.hover' }}>
                    <Typography variant="h6" component="h2">Fetch Settings</Typography>
                </Box>
                <Divider />
                <List disablePadding>
                    <ListItem>
                        <ListItemText
                            primary="Page Mode: Concurrent Tabs"
                            secondary="Number of browser tabs to open simultaneously (1-5)"
                        />
                        <ListItemSecondaryAction>
                            <TextField
                                type="number"
                                value={setting.pageModeConcurrency || 1}
                                onChange={(e) => setSetting({ pageModeConcurrency: Math.max(1, Math.min(5, Number(e.target.value))) })}
                                size="small"
                                inputProps={{ min: 1, max: 5 }}
                                sx={{ width: 80 }}
                            />
                        </ListItemSecondaryAction>
                    </ListItem>
                    <Divider component="li" />
                    <ListItem>
                        <ListItemText
                            primary="Fast Mode: Concurrent Requests"
                            secondary="Number of parallel HTTP requests (1-10)"
                        />
                        <ListItemSecondaryAction>
                            <TextField
                                type="number"
                                value={setting.fastModeConcurrency || 3}
                                onChange={(e) => setSetting({ fastModeConcurrency: Math.max(1, Math.min(10, Number(e.target.value))) })}
                                size="small"
                                inputProps={{ min: 1, max: 10 }}
                                sx={{ width: 80 }}
                            />
                        </ListItemSecondaryAction>
                    </ListItem>
                    <Divider component="li" />
                    <ListItem>
                        <ListItemText
                            primary="Auto-fetch on Bookmark"
                            secondary="Automatically fetch thumbnail when a new bookmark is created"
                        />
                        <ListItemSecondaryAction>
                            <Switch
                                edge="end"
                                checked={!!setting.autoFetchOnBookmark}
                                onChange={async () => await setSetting({ autoFetchOnBookmark: !setting.autoFetchOnBookmark })}
                            />
                        </ListItemSecondaryAction>
                    </ListItem>
                    <Divider component="li" />
                    <ListItem>
                        <ListItemText
                            primary="Delay Control (Fast Mode Only)"
                            secondary="Pause fast mode fetching periodically to avoid detection"
                        />
                        <ListItemSecondaryAction>
                            <Switch
                                edge="end"
                                checked={!!setting.enableDelay}
                                onChange={async () => await setSetting({ enableDelay: !setting.enableDelay })}
                                color="primary"
                            />
                        </ListItemSecondaryAction>
                    </ListItem>
                    <Collapse in={!!setting.enableDelay}>
                        <Divider component="li" />
                        <Box sx={{ p: 3 }}>
                            <Stack spacing={3}>
                                <Box>
                                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                                        Pause fetching after every N items to avoid being detected as a crawler. Only applies to Fast Mode.
                                    </Typography>
                                    <TextField
                                        fullWidth
                                        label="Fetch count before delay"
                                        type="number"
                                        value={setting.fetchDelayCount || 5}
                                        onChange={(e) => setSetting({ fetchDelayCount: Number(e.target.value) })}
                                        size="small"
                                        inputProps={{ min: 1 }}
                                    />
                                </Box>
                                <Box sx={{ display: 'flex', gap: 2 }}>
                                    <TextField
                                        fullWidth
                                        label="Min Delay"
                                        type="number"
                                        value={setting.fetchDelayTimeMin || 1000}
                                        onChange={(e) => setSetting({ fetchDelayTimeMin: Number(e.target.value) })}
                                        size="small"
                                        inputProps={{ min: 0 }}
                                    />
                                    <TextField
                                        fullWidth
                                        label="Max Delay"
                                        type="number"
                                        value={setting.fetchDelayTimeMax || 3000}
                                        onChange={(e) => setSetting({ fetchDelayTimeMax: Number(e.target.value) })}
                                        size="small"
                                        inputProps={{ min: 0 }}
                                    />
                                </Box>
                            </Stack>
                        </Box>
                    </Collapse>
                    <Divider component="li" />
                    <ListItem>
                        <ListItemText
                            primary="Video: Chunk Size (MB)"
                            secondary="Size of each video data chunk to fetch for frame extraction"
                        />
                        <ListItemSecondaryAction>
                            <TextField
                                type="number"
                                value={setting.videoFetchChunkSize ?? 1.5}
                                onChange={(e) => setSetting({ videoFetchChunkSize: Number(e.target.value) })}
                                size="small"
                                inputProps={{ min: 0.1, step: 0.1 }}
                                sx={{ width: 80 }}
                            />
                        </ListItemSecondaryAction>
                    </ListItem>
                    <Divider component="li" />
                    <ListItem>
                        <ListItemText
                            primary="Video: Max Fetch Retries"
                            secondary="Maximum number of additional chunks to fetch if frame extraction fails"
                        />
                        <ListItemSecondaryAction>
                            <TextField
                                type="number"
                                value={setting.videoFetchMaxRetries ?? 3}
                                onChange={(e) => setSetting({ videoFetchMaxRetries: Number(e.target.value) })}
                                size="small"
                                inputProps={{ min: 0 }}
                                sx={{ width: 80 }}
                            />
                        </ListItemSecondaryAction>
                    </ListItem>
                </List>
            </Paper>

            {/* Debug Settings */}
            <Paper sx={{ mb: 4, overflow: 'hidden' }} variant="outlined">
                <Box sx={{ p: 2, bgcolor: 'action.hover' }}>
                    <Typography variant="h6" component="h2">Debug</Typography>
                </Box>
                <Divider />
                <List disablePadding>
                    <ListItem>
                        <ListItemText
                            primary="Logging Level"
                            secondary="Set the level of detail for system logs"
                        />
                        <ListItemSecondaryAction>
                            <Select
                                value={setting.logLevel || 'info'}
                                onChange={handleLogLevelChange}
                                size="small"
                                sx={{ minWidth: 120 }}
                            >
                                <MenuItem value="debug">Debug</MenuItem>
                                <MenuItem value="info">Info</MenuItem>
                                <MenuItem value="warn">Warning</MenuItem>
                                <MenuItem value="error">Error</MenuItem>
                                <MenuItem value="none">None</MenuItem>
                            </Select>
                        </ListItemSecondaryAction>
                    </ListItem>
                    <Divider component="li" />
                    <ListItem>
                        <ListItemText
                            primary="Keep Tabs Open"
                            secondary="Do not automatically close pages when fetching covers"
                        />
                        <ListItemSecondaryAction>
                            <Switch
                                edge="end"
                                checked={!!setting.keepTabsOpen}
                                onChange={async () => await setSetting({ keepTabsOpen: !setting.keepTabsOpen })}
                                color="secondary"
                            />
                        </ListItemSecondaryAction>
                    </ListItem>

                </List>
            </Paper>

            {/* Data Management */}
            <Paper sx={{ mb: 4, overflow: 'hidden' }} variant="outlined">
                <Box sx={{ p: 2, bgcolor: 'action.hover' }}>
                    <Typography variant="h6" component="h2">Data Management</Typography>
                </Box>
                <Divider />
                <Box sx={{ p: 3 }}>
                    <Stack spacing={4}>
                        {/* Export Section */}
                        <Box>
                            <Typography variant="subtitle1" gutterBottom fontWeight="medium">
                                Export Data
                            </Typography>
                            <Typography variant="body2" color="text.secondary" paragraph>
                                Download a backup of your Settings, Fetch Configs, and all cached Cover Images in a single ZIP file.
                            </Typography>
                            <Button
                                variant="outlined"
                                startIcon={<DownloadIcon />}
                                onClick={handleExport}
                            >
                                Export Full Backup
                            </Button>
                        </Box>

                        <Divider />

                        {/* Import Section */}
                        <Box>
                            <Typography variant="subtitle1" gutterBottom fontWeight="medium">
                                Import Data
                            </Typography>
                            <Typography variant="body2" color="text.secondary" paragraph>
                                Restore settings or covers from a JSON or ZIP file.
                            </Typography>
                            <input
                                type="file"
                                accept=".json,.zip"
                                ref={fileInputRef}
                                style={{ display: "none" }}
                                onChange={handleFileChange}
                            />
                            <Button
                                variant="outlined"
                                color="primary"
                                startIcon={<UploadFileIcon />}
                                onClick={handleImportClick}
                            >
                                Import Backup
                            </Button>
                        </Box>

                        <Divider />

                        {/* Clear Storage Section */}
                        <Box>
                            <Typography variant="subtitle1" gutterBottom fontWeight="medium" color="error">
                                Danger Zone
                            </Typography>
                            <Typography variant="body2" color="text.secondary" paragraph>
                                Clear all cached cover images to free up storage space. This action cannot be undone.
                            </Typography>
                            <Button
                                variant="outlined"
                                color="error"
                                startIcon={<DeleteForeverIcon />}
                                onClick={handleClearCovers}
                            >
                                Clear All Covers
                            </Button>
                        </Box>
                    </Stack>
                </Box>
            </Paper>
        </Container>
    );
}
