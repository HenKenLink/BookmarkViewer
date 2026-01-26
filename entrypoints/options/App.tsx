import { HashRouter as Router, Routes, Route } from "react-router-dom";
import { Box } from "@mui/material";
import { NavBar } from "./Components/NavBar";

import { ViewerPage } from "./Pages/viewerPage";
import { ConfigPage } from "./Pages/configPage";
import { ConfigEditPage } from "./Pages/configEditPage";
import { useLoadBookmarks } from "./hooks/useLoadBookmarks";
import { NavItem } from "@/entrypoints/global/types";

import { createTheme, ThemeProvider } from "@mui/material/styles";

import { useStore } from "./store";
import { Toaster } from "sonner";

const navItemList: NavItem[] = [
  {
    name: "Home",
    path: "/",
  },
  {
    name: "Config",
    path: "/config",
  },
];

const lightTheme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: "#1976d2",
    },
    background: {
      default: "#f5f5f5",
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: "none",
          "&.nav-button": {
            borderRadius: 8,
            textTransform: "none",
            backgroundColor: "#1976d2",
            color: "#fff",
          },
        },
      },
      defaultProps: {
        variant: "contained",
        color: "primary",
        size: "medium",
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {},
      },
      defaultProps: {},
    },
    MuiTypography: {
      styleOverrides: {
        root: {
          "&.card-title": {
            fontSize: 20,
            fontWeight: 400,
            // color: "#1976d2",
            marginBottom: 2,

            overflow: "hidden",
            textOverflow: "ellipsis",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
          },
        },
      },
    },
  },
});

const darkTheme = createTheme({
  palette: {
    mode: "dark",
    primary: {
      main: "#90caf9",
    },
    background: {
      default: "#121212",
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: "none",
        },
      },
      defaultProps: {
        variant: "contained",
        color: "primary",
        size: "medium",
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {},
      },
      defaultProps: {},
    },
  },
});

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

  // setMode("light");

  return (
    <ThemeProvider theme={theme}>
      <Toaster />
      <Router>
        <Box
          sx={{
            // backgroundColor: "#f5f5f5",
            minHeight: "100vh",
            padding: 2,
          }}
        >
          <NavBar title="BookmarkViewer" navItemList={navItemList}></NavBar>
          <Routes>
            <Route path="/" element={<ViewerPage />} />
            <Route path="/config" element={<ConfigPage />} />
            <Route path="/config/:id" element={<ConfigEditPage />} />
            <Route path="/config/new" element={<ConfigEditPage />} />
          </Routes>
        </Box>
      </Router>
    </ThemeProvider>
  );
}
