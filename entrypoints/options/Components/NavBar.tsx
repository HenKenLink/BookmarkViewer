import * as React from "react";
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import CssBaseline from "@mui/material/CssBaseline";
import Divider from "@mui/material/Divider";
import Drawer from "@mui/material/Drawer";
import IconButton from "@mui/material/IconButton";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import MenuIcon from "@mui/icons-material/Menu";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Tooltip from "@mui/material/Tooltip";

import Brightness4Icon from "@mui/icons-material/Brightness4";
import Brightness7Icon from "@mui/icons-material/Brightness7";
import AutoFixHighIcon from "@mui/icons-material/AutoFixHigh";
import AutoFixOffIcon from "@mui/icons-material/AutoFixOff";

import { Link } from "react-router-dom";

import { NavItem } from "@/entrypoints/global/types";

import SettingsBackupRestoreIcon from "@mui/icons-material/SettingsBackupRestore";

import { useStore } from "../store";
import { ExportImportDialog } from "./ExportImportDialog";

const drawerWidth = 240;

interface NavProps {
  window?: () => Window;
  navItemList: NavItem[];
}

export function NavBar(props: NavProps) {
  const setSetting = useStore((state) => state.setSetting);
  const setting = useStore((state) => state.setting);

  const { window: windowProp } = props;
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [backupDialogOpen, setBackupDialogOpen] = React.useState(false);

  const handleDrawerToggle = () => {
    setMobileOpen((prevState) => !prevState);
  };

  const toggleDarkMode = async () => {
    await setSetting({ darkMode: setting.darkMode ? false : true });
  };

  const toggleAnimations = async () => {
    await setSetting({ enableAnimations: !setting.enableAnimations });
  };

  const handleOpenBackupDialog = () => {
    setBackupDialogOpen(true);
  };

  const handleCloseBackupDialog = () => {
    setBackupDialogOpen(false);
  };

  const drawer = (
    <Box onClick={handleDrawerToggle} sx={{ textAlign: "center" }}>

      <Divider />
      <List>
        {props.navItemList.map((item) => (
          <ListItem key={item.name} disablePadding>
            <ListItemButton
              sx={{ textAlign: "center" }}
              component={Link}
              to={item.path}
            >
              <ListItemText primary={item.name} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Box>
  );

  const container =
    windowProp !== undefined ? () => windowProp().document.body : undefined;

  return (
    <>
      <Box sx={{ display: "flex" }}>
        <CssBaseline />
        <AppBar
          component="nav"
          position="sticky"
          sx={{
            background: (theme) => theme.palette.mode === 'light'
              ? `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`
              : `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.background.paper} 100%)`,
            boxShadow: (theme) => theme.palette.mode === 'light'
              ? '0 8px 32px rgba(25, 118, 210, 0.25)'
              : '0 8px 32px rgba(0, 0, 0, 0.4)',
            color: 'white',
          }}
        >
          <Toolbar variant="dense" sx={{ justifyContent: "space-between" }}>
            <Box sx={{ display: { xs: "none", sm: "flex" }, gap: 2 }}>
              {props.navItemList.map((item) => (
                <Button
                  key={item.name}
                  component={Link}
                  to={item.path}
                  variant="text"
                  sx={{
                    color: "rgba(255, 255, 255, 0.9)",
                    borderRadius: "12px",
                    px: 3,
                    py: 1,
                    textTransform: "none",
                    fontWeight: 600,
                    fontSize: "0.95rem",
                    transition: "all 0.2s ease-in-out",
                    "&:hover": {
                      backgroundColor: "rgba(255, 255, 255, 0.2)",
                      transform: "translateY(-1px)",
                      color: "white",
                    },
                    "&.active": {
                      backgroundColor: "rgba(255, 255, 255, 0.25)",
                      color: "white",
                      boxShadow: "0 2px 8px rgba(0, 0, 0, 0.2)",
                    }
                  }}
                >
                  {item.name}
                </Button>
              ))}
            </Box>
            <Box>
              <Tooltip title="Backup & Restore">
                <IconButton
                  onClick={handleOpenBackupDialog}
                  sx={{
                    color: "white",
                    "&:hover": { backgroundColor: "rgba(255, 255, 255, 0.15)" }
                  }}
                >
                  <SettingsBackupRestoreIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title={setting.enableAnimations ? "Disable Animations" : "Enable Animations"}>
                <IconButton
                  onClick={toggleAnimations}
                  sx={{
                    ml: 1,
                    color: "white",
                    "&:hover": { backgroundColor: "rgba(255, 255, 255, 0.15)" }
                  }}
                >
                  {setting.enableAnimations ? <AutoFixHighIcon /> : <AutoFixOffIcon />}
                </IconButton>
              </Tooltip>
              <IconButton
                onClick={toggleDarkMode}
                sx={{
                  ml: 1,
                  color: "white",
                  "&:hover": { backgroundColor: "rgba(255, 255, 255, 0.15)" }
                }}
              >
                {setting.darkMode ? <Brightness7Icon /> : <Brightness4Icon />}
              </IconButton>
            </Box>
            <IconButton
              aria-label="open drawer"
              edge="start"
              onClick={handleDrawerToggle}
              sx={{
                ml: 2,
                display: { sm: "none" },
                color: "white",
                "&:hover": { backgroundColor: "rgba(255, 255, 255, 0.15)" }
              }}
            >
              <MenuIcon />
            </IconButton>
          </Toolbar>
        </AppBar>
        <ExportImportDialog
          open={backupDialogOpen}
          onClose={handleCloseBackupDialog}
        />
        <nav>
          <Drawer
            container={container}
            variant="temporary"
            open={mobileOpen}
            onClose={handleDrawerToggle}
            ModalProps={{
              keepMounted: true, // Better open performance on mobile.
            }}
            sx={{
              display: { xs: "block", sm: "none" },
              "& .MuiDrawer-paper": {
                boxSizing: "border-box",
                width: drawerWidth,
              },
            }}
          >
            {drawer}
          </Drawer>
        </nav>
      </Box>
    </>
  );
}
