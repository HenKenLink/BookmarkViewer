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
import CloudDownloadIcon from "@mui/icons-material/CloudDownload";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";

import { Link } from "react-router-dom";

import { NavItem } from "@/entrypoints/global/types";

import { useStore } from "../store";
import { exportCovers, importCovers } from "../utils/exportImport";

const drawerWidth = 240;

interface NavProps {
  window?: () => Window;
  title: string;
  navItemList: NavItem[];
}

export function NavBar(props: NavProps) {
  const setSetting = useStore((state) => state.setSetting);
  const setting = useStore((state) => state.setting);
  const bookmarkMap = useStore((state) => state.bookmarkMap);

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const { window } = props;
  const [mobileOpen, setMobileOpen] = React.useState(false);

  const handleDrawerToggle = () => {
    setMobileOpen((prevState) => !prevState);
  };

  const toggleDarkMode = async () => {
    await setSetting({ darkMode: setting.darkMode ? false : true });
  };

  const toggleAnimations = async () => {
    await setSetting({ enableAnimations: !setting.enableAnimations });
  };

  const handleExport = async () => {
    await exportCovers();
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      await importCovers(e.target.files[0], bookmarkMap, (msg) => alert(msg));
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const drawer = (
    <Box onClick={handleDrawerToggle} sx={{ textAlign: "center" }}>
      <Typography variant="h6" sx={{ my: 2 }}>
        {props.title}
      </Typography>
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
    window !== undefined ? () => window().document.body : undefined;

  return (
    <>
      <Box sx={{ display: "flex" }}>
        <CssBaseline />
        <AppBar component="nav">
          <Toolbar>
            <IconButton
              color="inherit"
              aria-label="open drawer"
              edge="start"
              onClick={handleDrawerToggle}
              sx={{ mr: 2, display: { sm: "none" } }}
            >
              <MenuIcon />
            </IconButton>
            <Typography
              variant="h6"
              component="div"
              sx={{ flexGrow: 1, display: { xs: "none", sm: "block" } }}
            >
              {props.title}
            </Typography>
            <Box sx={{ flexGrow: 1, display: { xs: "none", sm: "block" } }}>
              {props.navItemList.map((item) => (
                <Button
                  key={item.name}
                  sx={{ color: "#fff" }}
                  component={Link}
                  to={item.path}
                  variant="text"
                >
                  {item.name}
                </Button>
              ))}
            </Box>
            <Box>
              <input
                type="file"
                accept=".zip"
                ref={fileInputRef}
                style={{ display: "none" }}
                onChange={handleFileChange}
              />
              <Tooltip title="Export Covers">
                <IconButton color="inherit" onClick={handleExport}>
                  <CloudDownloadIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="Import Covers">
                <IconButton color="inherit" onClick={handleImportClick}>
                  <CloudUploadIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title={setting.enableAnimations ? "Disable Animations" : "Enable Animations"}>
                <IconButton
                  color="inherit"
                  onClick={toggleAnimations}
                  sx={{ ml: 1 }}
                >
                  {setting.enableAnimations ? <AutoFixHighIcon /> : <AutoFixOffIcon />}
                </IconButton>
              </Tooltip>
              <IconButton
                color="inherit"
                onClick={toggleDarkMode}
                sx={{ ml: 1 }}
              >
                {setting.darkMode ? <Brightness7Icon /> : <Brightness4Icon />}
              </IconButton>
            </Box>
          </Toolbar>
        </AppBar>
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
      {/* Empty toolbar element to push the page down; prevents nav bar from overlapping the page */}
      <Toolbar />
    </>
  );
}
