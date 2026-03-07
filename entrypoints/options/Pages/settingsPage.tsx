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
} from "@mui/material";
import { useStore } from "../store";
import { exportAll, exportCovers, exportSettings, importFile } from "../utils/exportImport";
import DeleteForeverIcon from "@mui/icons-material/DeleteForever";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import DownloadIcon from "@mui/icons-material/Download";
import { PAGE_ITEM_SX } from "../consts";

export function SettingsPage() {
    const setting = useStore((state) => state.setting);
    const setSetting = useStore((state) => state.setSetting);
    const bookmarkMap = useStore((state) => state.bookmarkMap);
    const clearAllCovers = useStore((state) => state.clearAllCovers);

    const [exportSettingsChecked, setExportSettingsChecked] = useState(true);
    const [exportCoversChecked, setExportCoversChecked] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const toggleAnimations = async () => {
        await setSetting({ enableAnimations: !setting.enableAnimations });
    };

    const toggleDarkMode = async () => {
        await setSetting({ darkMode: !setting.darkMode });
    };

    const handleExport = async () => {
        if (exportSettingsChecked && exportCoversChecked) {
            await exportAll();
        } else if (exportSettingsChecked) {
            await exportSettings();
        } else if (exportCoversChecked) {
            await exportCovers();
        } else {
            alert("Please select at least one item to export.");
        }
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
                                Download a backup of your settings and cached covers.
                            </Typography>
                            <Stack direction="row" spacing={3} alignItems="center" sx={{ mb: 2 }}>
                                <FormControlLabel
                                    control={
                                        <Checkbox
                                            checked={exportSettingsChecked}
                                            onChange={(e) => setExportSettingsChecked(e.target.checked)}
                                        />
                                    }
                                    label="Settings & Configs"
                                />
                                <FormControlLabel
                                    control={
                                        <Checkbox
                                            checked={exportCoversChecked}
                                            onChange={(e) => setExportCoversChecked(e.target.checked)}
                                        />
                                    }
                                    label="Cover Images"
                                />
                            </Stack>
                            <Button
                                variant="outlined"
                                startIcon={<DownloadIcon />}
                                onClick={handleExport}
                                disabled={!exportSettingsChecked && !exportCoversChecked}
                            >
                                Export Backup
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
