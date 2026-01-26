import { useStore } from "../store/index";
import { useState, useEffect } from "react";
import { toast } from "sonner";

import {
  Card,
  Box,
  TextField,
  Typography,
  Button,
  Toolbar,
  Checkbox,
  Chip,
  Stack,
  IconButton,
  Tooltip,
  alpha,
  Paper,
  Fade,
  Grow,
} from "@mui/material";

import LanguageIcon from "@mui/icons-material/Language";
import CodeIcon from "@mui/icons-material/Code";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";
import SettingsIcon from "@mui/icons-material/Settings";
import SearchIcon from "@mui/icons-material/Search";

import { Link, replace, useNavigate } from "react-router-dom";
import { styled, keyframes } from "@mui/material/styles";
import { CardItem, BoxItem } from "../Components/PageItem";
import { grey } from "@mui/material/colors";

import { PAGE_ITEM_SX } from "../consts";

// Gradient animation for header
const gradientShift = keyframes`
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
`;

// Styled components for modern UI
const HeaderBox = styled(Box, {
  shouldForwardProp: (prop) => prop !== "enableAnimations",
})<{ enableAnimations?: boolean }>(({ theme, enableAnimations }) => ({
  background: theme.palette.mode === "light"
    ? `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${alpha(theme.palette.primary.dark, 0.8)} 100%)`
    : `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.3)} 0%, ${alpha(theme.palette.primary.dark, 0.5)} 100%)`,
  borderRadius: 20,
  padding: theme.spacing(4),
  marginBottom: theme.spacing(4),
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  boxShadow: theme.palette.mode === "light"
    ? "0 10px 40px rgba(25, 118, 210, 0.2)"
    : "0 10px 40px rgba(0, 0, 0, 0.4)",
  position: "relative",
  overflow: "hidden",
  "&::before": {
    content: '""',
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: "linear-gradient(45deg, transparent 30%, rgba(255,255,255,0.1) 50%, transparent 70%)",
    backgroundSize: "200% 200%",
    animation: enableAnimations ? `${gradientShift} 3s ease infinite` : "none",
    pointerEvents: "none",
  },
}));

const ConfigCard = styled(Card)(({ theme }) => ({
  display: "flex",
  alignItems: "stretch",
  borderRadius: 16,
  overflow: "hidden",
  cursor: "pointer",
  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
  background: theme.palette.mode === "light"
    ? "linear-gradient(145deg, #ffffff 0%, #f8fafc 100%)"
    : `linear-gradient(145deg, ${alpha(theme.palette.background.paper, 1)} 0%, ${alpha(theme.palette.background.paper, 0.8)} 100%)`,
  border: `1px solid ${theme.palette.mode === "light" ? alpha(theme.palette.primary.main, 0.1) : alpha(theme.palette.divider, 0.3)}`,
  boxShadow: theme.palette.mode === "light"
    ? "0 4px 20px rgba(0, 0, 0, 0.05)"
    : "0 4px 20px rgba(0, 0, 0, 0.3)",
  position: "relative",
  "&:hover": {
    transform: "translateY(-4px) scale(1.01)",
    boxShadow: theme.palette.mode === "light"
      ? "0 20px 40px rgba(25, 118, 210, 0.15)"
      : "0 20px 40px rgba(0, 0, 0, 0.4)",
    borderColor: theme.palette.primary.main,
    "& .arrow-icon": {
      transform: "translateX(4px)",
      opacity: 1,
    },
    "& .config-name": {
      color: theme.palette.primary.main,
    },
  },
  "&::before": {
    content: '""',
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    background: `linear-gradient(180deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.light} 100%)`,
    borderRadius: "4px 0 0 4px",
  },
}));

const StyledChip = styled(Chip)(({ theme }) => ({
  background: theme.palette.mode === "light"
    ? alpha(theme.palette.primary.main, 0.08)
    : alpha(theme.palette.primary.main, 0.2),
  color: theme.palette.primary.main,
  fontWeight: 600,
  fontSize: "0.7rem",
  height: 24,
  borderRadius: 8,
  border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
}));

const ActionButton = styled(Button)(({ theme }) => ({
  borderRadius: 12,
  padding: theme.spacing(1, 3),
  fontWeight: 600,
  textTransform: "none",
  boxShadow: "none",
  transition: "all 0.2s ease",
  "&:hover": {
    transform: "translateY(-2px)",
    boxShadow: theme.palette.mode === "light"
      ? "0 8px 20px rgba(25, 118, 210, 0.3)"
      : "0 8px 20px rgba(0, 0, 0, 0.4)",
  },
}));

const EmptyStateBox = styled(Box)(({ theme }) => ({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  padding: theme.spacing(8),
  borderRadius: 20,
  background: theme.palette.mode === "light"
    ? alpha(theme.palette.primary.main, 0.03)
    : alpha(theme.palette.primary.main, 0.05),
  border: `2px dashed ${alpha(theme.palette.primary.main, 0.2)}`,
}));

export function ConfigPage() {
  const [isMutiSelect, setIsMutiSelect] = useState<boolean>(false);
  const [selectedItemList, setSelectedItemList] = useState<number[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");

  const configList = useStore((state) => state.fetchConfigList);
  const delFetchConfig = useStore((state) => state.delFetchConfig);
  const setting = useStore((state) => state.setting);
  const navigate = useNavigate();

  const configPageNavigate = (id: number) => {
    navigate(`/config/${id}`);
  };

  const filteredConfigList = configList.filter((config) =>
    config.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    config.hostname.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleDisplay = isMutiSelect ? "flex" : "none";

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 1000, mx: "auto" }}>
      {/* Modern Header Area */}
      <HeaderBox enableAnimations={setting.enableAnimations}>
        <Box sx={{ zIndex: 1 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 1 }}>
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: 3,
                background: "rgba(255, 255, 255, 0.2)",
                backdropFilter: "blur(10px)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <SettingsIcon sx={{ color: "white", fontSize: 28 }} />
            </Box>
            <Typography
              variant="h4"
              sx={{
                fontWeight: 800,
                color: "white",
                textShadow: "0 2px 10px rgba(0,0,0,0.1)",
                letterSpacing: "-0.5px",
              }}
            >
              Configurations
            </Typography>
          </Box>
          <Typography
            variant="body2"
            sx={{
              color: "rgba(255, 255, 255, 0.8)",
              ml: 8,
              fontWeight: 500,
            }}
          >
            Manage your fetch configurations • {configList.length} total
          </Typography>
        </Box>

        <Stack direction="row" spacing={1.5} sx={{ zIndex: 1 }}>
          {!isMutiSelect ? (
            <ActionButton
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => navigate(`/config/new`)}
              sx={{
                background: "rgba(255, 255, 255, 0.95)",
                color: "primary.main",
                "&:hover": {
                  background: "white",
                },
              }}
            >
              Add New
            </ActionButton>
          ) : (
            <ActionButton
              variant="contained"
              color="error"
              startIcon={<DeleteIcon />}
              disabled={selectedItemList.length === 0}
              onClick={async () => {
                await delFetchConfig(selectedItemList);
                toast.success("Config deleted successfully");
                setSelectedItemList([]);
                setIsMutiSelect(false);
              }}
              sx={{
                background: "rgba(255, 255, 255, 0.95)",
                color: "error.main",
                "&:hover": {
                  background: "white",
                },
              }}
            >
              Delete ({selectedItemList.length})
            </ActionButton>
          )}

          <ActionButton
            variant="outlined"
            startIcon={isMutiSelect ? <CloseIcon /> : <CheckIcon />}
            onClick={() => {
              setIsMutiSelect(!isMutiSelect);
              if (!isMutiSelect) {
                setSelectedItemList([]);
              }
            }}
            sx={{
              borderColor: "rgba(255, 255, 255, 0.5)",
              color: "white",
              "&:hover": {
                borderColor: "white",
                background: "rgba(255, 255, 255, 0.1)",
              },
            }}
          >
            {isMutiSelect ? "Cancel" : "Select"}
          </ActionButton>
        </Stack>
      </HeaderBox>

      {/* Search Bar */}
      {configList.length > 0 && (
        <Paper
          elevation={0}
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1.5,
            p: 1.5,
            pl: 2.5,
            mb: 3,
            borderRadius: 3,
            border: "1px solid",
            borderColor: "divider",
            transition: "all 0.2s ease",
            "&:focus-within": {
              borderColor: "primary.main",
              boxShadow: theme => `0 0 0 3px ${alpha(theme.palette.primary.main, 0.1)}`,
            },
          }}
        >
          <SearchIcon sx={{ color: "text.secondary", fontSize: 22 }} />
          <TextField
            variant="standard"
            placeholder="Search configurations..."
            fullWidth
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              disableUnderline: true,
              sx: { fontSize: "0.95rem" },
            }}
          />
        </Paper>
      )}

      {/* Config List */}
      <Stack spacing={2}>
        {filteredConfigList.length === 0 && configList.length > 0 ? (
          <EmptyStateBox>
            <SearchIcon sx={{ fontSize: 64, color: "text.disabled", mb: 2 }} />
            <Typography variant="h6" color="text.secondary" fontWeight={600}>
              No matching configurations
            </Typography>
            <Typography variant="body2" color="text.disabled" sx={{ mt: 1 }}>
              Try a different search term
            </Typography>
          </EmptyStateBox>
        ) : filteredConfigList.length === 0 ? (
          <EmptyStateBox>
            <SettingsIcon sx={{ fontSize: 64, color: "text.disabled", mb: 2 }} />
            <Typography variant="h6" color="text.secondary" fontWeight={600}>
              No configurations yet
            </Typography>
            <Typography variant="body2" color="text.disabled" sx={{ mt: 1, mb: 3 }}>
              Create your first configuration to get started
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => navigate(`/config/new`)}
              sx={{ borderRadius: 3, px: 4 }}
            >
              Add Configuration
            </Button>
          </EmptyStateBox>
        ) : (
          filteredConfigList.map((config, index) => {
            const id = config.id;
            return (
              <Grow in timeout={300 + index * 50} key={id} style={{ transitionDuration: setting.enableAnimations ? undefined : '0ms' }}>
                <ConfigCard onClick={() => configPageNavigate(id)}>
                  {/* Multi-select check zone */}
                  {isMutiSelect && (
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        px: 2,
                        backgroundColor: (theme) =>
                          alpha(theme.palette.primary.main, 0.05),
                        borderRight: "1px solid",
                        borderColor: "divider",
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Checkbox
                        checked={selectedItemList.includes(id)}
                        onChange={(e) => {
                          const isChecked = e.target.checked;
                          if (isChecked) {
                            setSelectedItemList((prev) => [...prev, id]);
                          } else {
                            setSelectedItemList((prev) =>
                              prev.filter((item) => item !== id)
                            );
                          }
                        }}
                        sx={{
                          "&.Mui-checked": {
                            color: "primary.main",
                          },
                        }}
                      />
                    </Box>
                  )}

                  <Box
                    sx={{
                      p: 2.5,
                      pl: 3,
                      flexGrow: 1,
                      display: "flex",
                      flexDirection: "column",
                      gap: 1.5,
                    }}
                  >
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <Typography
                        className="config-name"
                        variant="h6"
                        sx={{
                          fontWeight: 700,
                          fontSize: "1.1rem",
                          transition: "color 0.2s ease",
                          letterSpacing: "-0.3px",
                        }}
                      >
                        {config.name}
                      </Typography>

                      <StyledChip label={`#${id}`} size="small" />
                    </Box>

                    <Stack direction="row" spacing={2.5} alignItems="center" flexWrap="wrap">
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 1,
                          color: "text.secondary",
                          minWidth: 0,
                        }}
                      >
                        <Box
                          sx={{
                            width: 28,
                            height: 28,
                            borderRadius: 1.5,
                            backgroundColor: (theme) =>
                              alpha(theme.palette.info.main, 0.1),
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <LanguageIcon
                            sx={{ fontSize: 16, color: "info.main" }}
                          />
                        </Box>
                        <Typography
                          variant="body2"
                          noWrap
                          sx={{ fontWeight: 500, maxWidth: 200 }}
                        >
                          {config.hostname}
                        </Typography>
                      </Box>

                      {config.regexPattern && (
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 1,
                            color: "text.secondary",
                            minWidth: 0,
                          }}
                        >
                          <Box
                            sx={{
                              width: 28,
                              height: 28,
                              borderRadius: 1.5,
                              backgroundColor: (theme) =>
                                alpha(theme.palette.warning.main, 0.1),
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <CodeIcon
                              sx={{ fontSize: 16, color: "warning.main" }}
                            />
                          </Box>
                          <Typography
                            variant="body2"
                            noWrap
                            sx={{
                              fontFamily: "monospace",
                              backgroundColor: (theme) =>
                                alpha(theme.palette.grey[500], 0.1),
                              px: 1,
                              py: 0.3,
                              borderRadius: 1,
                              fontSize: "0.8rem",
                              maxWidth: 200,
                            }}
                          >
                            {config.regexPattern}
                          </Typography>
                        </Box>
                      )}
                    </Stack>
                  </Box>

                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      px: 2.5,
                      color: "grey.400",
                    }}
                  >
                    <ArrowForwardIosIcon
                      className="arrow-icon"
                      sx={{
                        fontSize: 16,
                        transition: "all 0.2s ease",
                        opacity: 0.5,
                      }}
                    />
                  </Box>
                </ConfigCard>
              </Grow>
            );
          })
        )}
      </Stack>
    </Box>
  );
}
