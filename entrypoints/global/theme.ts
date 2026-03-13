import { createTheme } from "@mui/material/styles";

export const lightTheme = createTheme({
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
    MuiTypography: {
      styleOverrides: {
        root: {
          "&.card-title": {
            fontSize: 20,
            fontWeight: 400,
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

export const darkTheme = createTheme({
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
  },
});
