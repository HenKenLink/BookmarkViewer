import { HashRouter as Router, Routes, Route, useNavigate } from "react-router-dom";
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
import { PhotoProvider } from "react-photo-view";
import "react-photo-view/dist/react-photo-view.css";

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

// Handles global mouse button navigation (side buttons)
function GlobalNavigationHandler() {
  const navigate = useNavigate();

  useEffect(() => {
    const handleNavigation = (e: MouseEvent) => {
      // Mouse button codes: 3 is Back, 4 is Forward
      if (e.button === 3) {
        e.preventDefault();
        e.stopPropagation();
        navigate(-1);
      } else if (e.button === 4) {
        e.preventDefault();
        e.stopPropagation();
        navigate(1);
      }
    };

    window.addEventListener("auxclick", handleNavigation);
    window.addEventListener("mouseup", handleNavigation);

    return () => {
      window.removeEventListener("auxclick", handleNavigation);
      window.removeEventListener("mouseup", handleNavigation);
    };
  }, [navigate]);

  return null;
}

export default function App() {
  useLoadBookmarks();
  const setting = useStore((state) => state.setting);

  const [mode, setMode] = useState<"light" | "dark">("light");
  const theme = mode === "light" ? lightTheme : darkTheme;

  useEffect(() => {
    setMode(setting.darkMode ? "dark" : "light");
  }, [setting]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <PhotoProvider
        maskOpacity={0.8}
        bannerVisible={false}
        speed={() => 0}
      >
        <Toaster />
        <Router>
          <GlobalNavigationHandler />
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
      </PhotoProvider>
    </ThemeProvider>
  );
}
