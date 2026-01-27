import * as React from "react";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import FormControlLabel from "@mui/material/FormControlLabel";
import Checkbox from "@mui/material/Checkbox";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import { exportSettings, exportCovers, exportAll, importFile } from "../utils/exportImport";
import { useStore } from "../store";

interface ExportImportDialogProps {
    open: boolean;
    onClose: () => void;
}

export function ExportImportDialog({ open, onClose }: ExportImportDialogProps) {
    const [exportSettingsChecked, setExportSettingsChecked] = React.useState(true);
    const [exportCoversChecked, setExportCoversChecked] = React.useState(false);
    const bookmarkMap = useStore((state) => state.bookmarkMap);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const handleExport = async () => {
        if (exportSettingsChecked && exportCoversChecked) {
            await exportAll();
        } else if (exportSettingsChecked) {
            await exportSettings();
        } else if (exportCoversChecked) {
            await exportCovers();
        } else {
            alert("Please select at least one item to export.");
            return;
        }
        onClose();
    };

    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            await importFile(e.target.files[0], bookmarkMap, (msg) => alert(msg));
            if (fileInputRef.current) fileInputRef.current.value = "";
            onClose();
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
            <DialogTitle>Backup & Restore</DialogTitle>
            <DialogContent>
                <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" gutterBottom color="text.secondary">
                        Export Options
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={exportSettingsChecked}
                                    onChange={(e) => setExportSettingsChecked(e.target.checked)}
                                />
                            }
                            label="Settings & Fetch Configs"
                        />
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={exportCoversChecked}
                                    onChange={(e) => setExportCoversChecked(e.target.checked)}
                                />
                            }
                            label="Bookmark Covers"
                        />
                    </Box>
                </Box>
                <Typography variant="body2" color="text.secondary">
                    Import will automatically detect if the file is a settings JSON or a backup ZIP.
                </Typography>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
                <input
                    type="file"
                    accept=".json,.zip"
                    ref={fileInputRef}
                    style={{ display: "none" }}
                    onChange={handleFileChange}
                />
                <Button onClick={handleImportClick} color="secondary" variant="outlined">
                    Import
                </Button>
                <Box sx={{ flexGrow: 1 }} />
                <Button onClick={onClose} color="inherit">
                    Cancel
                </Button>
                <Button onClick={handleExport} variant="contained" color="primary">
                    Export
                </Button>
            </DialogActions>
        </Dialog>
    );
}
