import { HashRouter as Router, Routes, Route } from "react-router-dom";
import { Box, CssBaseline } from "@mui/material";
import { NavBar } from "./Components/NavBar";
import { useState, useEffect } from "react";

import { ViewerPage } from "./Pages/viewerPage";
import { ConfigPage } from "./Pages/configPage";
import { ConfigEditPage } from "./Pages/configEditPage";
import { SettingsPage } from "./Pages/settingsPage";
import { useLoadBookmarks } from "./hooks/useLoadBookmarks";
import { NavItem } from "@/entrypoints/global/types";

import { ThemeProvider } from "@mui/material/styles";
import { lightTheme, darkTheme } from "../global/theme";

import { useStore } from "./store";
import { Toaster } from "sonner";

const navItemList: NavItem[] = [
  {
    name: "Viewer",
    path: "/",
  },
  {
    name: "Config",
    path: "/config",
  },
  {
    name: "Settings",
    path: "/settings",
  },
];


export default function App() {
  useLoadBookmarks();
  const getSetting = useStore((state) => state.getSetting);
  const setting = useStore((state) => state.setting);

  const [mode, setMode] = useState<"light" | "dark">("light");
  const theme = mode === "light" ? lightTheme : darkTheme;

  useEffect(() => {
    getSetting();
  }, []);

  useEffect(() => {
    setMode(setting.darkMode ? "dark" : "light");
  }, [setting]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Toaster />
      <Router>
        <Box
          sx={{
            minHeight: "100vh",
          }}
        >
          <NavBar navItemList={navItemList} />
          <Routes>
            <Route path="/" element={<ViewerPage />} />
            <Route path="/config" element={<ConfigPage />} />
            <Route path="/config/:id" element={<ConfigEditPage />} />
            <Route path="/config/new" element={<ConfigEditPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </Box>
      </Router>
    </ThemeProvider>
  );
}
