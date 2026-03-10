import { useStore } from "../store/index";
import { useState, useEffect } from "react";

import {
    Box,
    TextField,
    Typography,
    Button,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    Card,
    CardContent,
    Grid,
    Stack,
    Divider,
    IconButton,
    Tooltip,
    alpha,
    Paper,
    Collapse,
    Grow,
} from "@mui/material";

import { useMediaQuery, useTheme } from "@mui/material";

import { useNavigate, useParams } from "react-router-dom";

import { autocompletion } from "@codemirror/autocomplete";

import { FetchConfig, SelectorType, FetchMode, ResultType } from "@/entrypoints/global/types";
import { toast } from "sonner";
import InfoIcon from "@mui/icons-material/Info";
import LanguageIcon from "@mui/icons-material/Language";
import CodeIcon from "@mui/icons-material/Code";
import RuleIcon from "@mui/icons-material/Rule";
import SaveIcon from "@mui/icons-material/Save";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import EditIcon from "@mui/icons-material/Edit";
import AddIcon from "@mui/icons-material/Add";
import TextFieldsIcon from "@mui/icons-material/TextFields";
import TuneIcon from "@mui/icons-material/Tune";
import PhotoIcon from "@mui/icons-material/Photo";
import OndemandVideoIcon from "@mui/icons-material/OndemandVideo";

import { styled, keyframes } from "@mui/material/styles";

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
    background:
        theme.palette.mode === "light"
            ? `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${alpha(theme.palette.primary.dark, 0.8)} 100%)`
            : `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.3)} 0%, ${alpha(theme.palette.primary.dark, 0.5)} 100%)`,
    borderRadius: 20,
    padding: theme.spacing(3, 4),
    marginBottom: theme.spacing(4),
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    boxShadow:
        theme.palette.mode === "light"
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
        background:
            "linear-gradient(45deg, transparent 30%, rgba(255,255,255,0.1) 50%, transparent 70%)",
        backgroundSize: "200% 200%",
        animation: enableAnimations ? `${gradientShift} 3s ease infinite` : "none",
        pointerEvents: "none",
    },
}));

const StyledCard = styled(Card)(({ theme }) => ({
    borderRadius: 16,
    overflow: "hidden",
    border: `1px solid ${theme.palette.mode === "light" ? alpha(theme.palette.primary.main, 0.08) : alpha(theme.palette.divider, 0.3)}`,
    boxShadow:
        theme.palette.mode === "light"
            ? "0 4px 20px rgba(0, 0, 0, 0.05)"
            : "0 4px 20px rgba(0, 0, 0, 0.3)",
    transition: "all 0.3s ease",
    background:
        theme.palette.mode === "light"
            ? "linear-gradient(145deg, #ffffff 0%, #f8fafc 100%)"
            : `linear-gradient(145deg, ${alpha(theme.palette.background.paper, 1)} 0%, ${alpha(theme.palette.background.paper, 0.8)} 100%)`,
}));

const SectionHeader = styled(Box)(({ theme }) => ({
    display: "flex",
    alignItems: "center",
    gap: theme.spacing(1.5),
    marginBottom: theme.spacing(2.5),
    paddingBottom: theme.spacing(2),
    borderBottom: `2px solid ${alpha(theme.palette.primary.main, 0.1)}`,
}));

const SectionIcon = styled(Box)(({ theme }) => ({
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: alpha(theme.palette.primary.main, 0.1),
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: theme.palette.primary.main,
}));

const ActionButton = styled(Button)(({ theme }) => ({
    borderRadius: 12,
    padding: theme.spacing(1.2, 3),
    fontWeight: 600,
    textTransform: "none",
    boxShadow: "none",
    transition: "all 0.2s ease",
    "&:hover": {
        transform: "translateY(-2px)",
        boxShadow:
            theme.palette.mode === "light"
                ? "0 8px 20px rgba(25, 118, 210, 0.3)"
                : "0 8px 20px rgba(0, 0, 0, 0.4)",
    },
}));

const ModeSelector = styled(Box)(({ theme }) => ({
    display: "flex",
    gap: theme.spacing(1.5),
    padding: theme.spacing(0.5),
    backgroundColor: alpha(theme.palette.grey[500], 0.08),
    borderRadius: 14,
    marginBottom: theme.spacing(3),
}));

const ModeButton = styled(Button, {
    shouldForwardProp: (prop) => prop !== "active",
})<{ active?: boolean }>(({ theme, active }) => ({
    flex: 1,
    borderRadius: 12,
    padding: theme.spacing(1.5, 2),
    fontWeight: 600,
    textTransform: "none",
    transition: "all 0.2s ease",
    background: active
        ? theme.palette.mode === "light"
            ? "white"
            : alpha(theme.palette.primary.main, 0.2)
        : "transparent",
    color: active ? theme.palette.primary.main : theme.palette.text.secondary,
    boxShadow: active
        ? theme.palette.mode === "light"
            ? "0 2px 8px rgba(0,0,0,0.08)"
            : "0 2px 8px rgba(0,0,0,0.3)"
        : "none",
    "&:hover": {
        background: active
            ? theme.palette.mode === "light"
                ? "white"
                : alpha(theme.palette.primary.main, 0.25)
            : alpha(theme.palette.grey[500], 0.1),
    },
}));

const StyledTextField = styled(TextField)(({ theme }) => ({
    "& .MuiOutlinedInput-root": {
        borderRadius: 12,
        transition: "all 0.2s ease",
        "&:hover": {
            borderColor: theme.palette.primary.main,
        },
        "&.Mui-focused": {
            boxShadow: `0 0 0 3px ${alpha(theme.palette.primary.main, 0.1)}`,
        },
    },
}));

const SelectorTypeButton = styled(Button, {
    shouldForwardProp: (prop) => prop !== "active",
})<{ active?: boolean }>(({ theme, active }) => ({
    borderRadius: 10,
    padding: theme.spacing(1, 2),
    fontWeight: 600,
    textTransform: "none",
    minWidth: 80,
    transition: "all 0.2s ease",
    border: `2px solid ${active ? theme.palette.primary.main : alpha(theme.palette.grey[500], 0.2)}`,
    background: active
        ? alpha(theme.palette.primary.main, 0.08)
        : "transparent",
    color: active ? theme.palette.primary.main : theme.palette.text.secondary,
    "&:hover": {
        borderColor: theme.palette.primary.main,
        background: alpha(theme.palette.primary.main, 0.05),
    },
}));

export function ConfigEditPage() {
    const [configName, setConfigName] = useState<string>("");
    const [configHostname, setConfigHostname] = useState<string>("");
    const [configRegexPettern, setConfigRegexPettern] = useState<string>("");
    const [configMode, setConfigMode] = useState<FetchMode>("page");
    const [configResultType, setConfigResultType] = useState<ResultType>("cover_url");
    const [configSelector, setConfigSelector] = useState<string>("");
    const [configSelectorType, setConfigSelectorType] =
        useState<SelectorType>("regex");
    const [configAttribute, setConfigAttribute] = useState<string>("");

    const [selectorValues, setSelectorValues] = useState<
        Record<SelectorType, { selector: string; attribute: string }>
    >({
        regex: { selector: "", attribute: "" },
        css: { selector: "", attribute: "" },
        xpath: { selector: "", attribute: "" },
    });

    const { id } = useParams();
    let isNew = false;
    if (!id) {
        isNew = true;
    }
    const configList = useStore((state) => state.fetchConfigList);
    const setFetchConfig = useStore((state) => state.setFetchConfig);
    const setting = useStore((state) => state.setting);

    const navigate = useNavigate();

    const navigateBack = () => navigate("/config", { replace: true });

    const theme = useTheme();
    const matches = useMediaQuery(theme.breakpoints.up("md"));

    useEffect(() => {
        if (!isNew) {
            const matchedConfig: FetchConfig = configList.find(
                (config) => String(config.id) === String(id)
            ) as FetchConfig;

            if (!matchedConfig) {
                navigateBack();
                return;
            }
            setConfigName(matchedConfig.name);
            setConfigHostname(matchedConfig.hostname);
            setConfigMode(matchedConfig.mode || "page");
            setConfigResultType(matchedConfig.resultType || "cover_url");
            const initialSelectorType = matchedConfig.selectorType || "regex";
            setConfigSelectorType(initialSelectorType);

            const initialSelector = matchedConfig.selector || "";
            const initialAttribute = matchedConfig.attribute || "";

            setConfigSelector(initialSelector);
            setConfigAttribute(initialAttribute);

            // Initialize the values map with the loaded config placed in the correct slot
            setSelectorValues((prev) => ({
                ...prev,
                [initialSelectorType]: {
                    selector: initialSelector,
                    attribute: initialAttribute,
                },
            }));

            const regexPattern = matchedConfig.regexPattern;
            if (regexPattern) {
                setConfigRegexPettern(regexPattern);
            }
        }
    }, []);

    // const name = matchedConfig ? matchedConfig.name : "";

    const direction = matches ? "row" : "column";

    const getNewId = (): number => {
        const maxId =
            configList.length > 0
                ? Math.max(...configList.map((config) => config.id))
                : 0;

        return maxId + 1;
    };

    const handleSave = async () => {
        // TODO: Show a dialog to confirm to save config.
        let configId: number;
        if (isNew) {
            configId = getNewId();
        } else {
            configId = Number(id);
        }
        if (
            !configName ||
            !configHostname ||
            (configMode === "page" && !configSelector) ||
            (configMode === "fast" && !configSelector)
        ) {
            toast.error(
                "Please fill in all required fields (Name, Hostname, and Mode-specific fields)"
            );
            return;
        }
        const config: FetchConfig = {
            id: configId,
            name: configName,
            hostname: configHostname,
            regexPattern: configRegexPettern,
            mode: configMode,
            resultType: configMode === "page" ? configResultType : undefined,
            selector: (configMode === "fast" || configMode === "page") ? configSelector : undefined,
            selectorType: (configMode === "fast" || configMode === "page") ? configSelectorType : undefined,
            attribute:
                (configMode === "fast" || configMode === "page") && configSelectorType === "css"
                    ? configAttribute
                    : undefined,
        };
        if (isNew) {
            await setFetchConfig(config, false);
            toast.success("Configuration created successfully!");
        } else {
            await setFetchConfig(config, true);
            toast.success("Configuration saved successfully!");
        }

        // TODO: Add dialog to show "config saved".
        navigateBack();
        // await addFetchConfig(config);
    };

    return (
        <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 1200, mx: "auto" }}>
            {/* Modern Header */}
            <HeaderBox enableAnimations={setting.enableAnimations}>
                <Box
                    sx={{ display: "flex", alignItems: "center", gap: 2.5, zIndex: 1 }}
                >
                    <Tooltip title="Back to list">
                        <IconButton
                            onClick={navigateBack}
                            sx={{
                                backgroundColor: "rgba(255, 255, 255, 0.15)",
                                backdropFilter: "blur(10px)",
                                color: "white",
                                "&:hover": {
                                    backgroundColor: "rgba(255, 255, 255, 0.25)",
                                },
                            }}
                        >
                            <ArrowBackIcon />
                        </IconButton>
                    </Tooltip>
                    <Box>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                            <Box
                                sx={{
                                    width: 40,
                                    height: 40,
                                    borderRadius: 2.5,
                                    background: "rgba(255, 255, 255, 0.2)",
                                    backdropFilter: "blur(10px)",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                }}
                            >
                                {isNew ? (
                                    <AddIcon sx={{ color: "white", fontSize: 24 }} />
                                ) : (
                                    <EditIcon sx={{ color: "white", fontSize: 22 }} />
                                )}
                            </Box>
                            <Typography
                                variant="h5"
                                sx={{
                                    fontWeight: 800,
                                    color: "white",
                                    textShadow: "0 2px 10px rgba(0,0,0,0.1)",
                                    letterSpacing: "-0.3px",
                                }}
                            >
                                {isNew ? "New Configuration" : "Edit Configuration"}
                            </Typography>
                        </Box>
                        {!isNew && (
                            <Typography
                                variant="body2"
                                sx={{
                                    color: "rgba(255, 255, 255, 0.7)",
                                    ml: 6.5,
                                    mt: 0.5,
                                    fontWeight: 500,
                                }}
                            >
                                ID: #{id}
                            </Typography>
                        )}
                    </Box>
                </Box>
                <ActionButton
                    variant="contained"
                    startIcon={<SaveIcon />}
                    onClick={handleSave}
                    sx={{
                        background: "rgba(255, 255, 255, 0.95)",
                        color: "primary.main",
                        px: 4,
                        zIndex: 1,
                        "&:hover": {
                            background: "white",
                        },
                    }}
                >
                    Save
                </ActionButton>
            </HeaderBox>

            <Stack spacing={3}>
                {/* Top Row: Basic Info & Matching Rules side by side on desktop */}
                <Grid container spacing={3}>
                    {/* Basic Information */}
                    <Grid size={{ xs: 12, md: 6 }}>
                        <Grow in timeout={300} style={{ transitionDuration: setting.enableAnimations ? undefined : '0ms' }}>
                            <StyledCard sx={{ height: "100%" }}>
                                <CardContent sx={{ p: 3 }}>
                                    <SectionHeader>
                                        <SectionIcon>
                                            <InfoIcon fontSize="small" />
                                        </SectionIcon>
                                        <Typography variant="h6" fontWeight={700} fontSize="1rem">
                                            Basic Information
                                        </Typography>
                                    </SectionHeader>
                                    <Stack spacing={2.5}>
                                        <StyledTextField
                                            label="Configuration Name"
                                            variant="outlined"
                                            fullWidth
                                            placeholder="e.g., YouTube Thumbnail Fetcher"
                                            value={configName}
                                            onChange={(e) => setConfigName(e.target.value)}
                                            InputProps={{
                                                startAdornment: (
                                                    <TextFieldsIcon
                                                        sx={{
                                                            mr: 1.5,
                                                            color: "text.disabled",
                                                            fontSize: 20,
                                                        }}
                                                    />
                                                ),
                                            }}
                                        />
                                        <StyledTextField
                                            label="Hostname"
                                            variant="outlined"
                                            fullWidth
                                            placeholder="www.example.com"
                                            helperText="The domain this configuration applies to"
                                            value={configHostname}
                                            onChange={(e) => setConfigHostname(e.target.value)}
                                            InputProps={{
                                                startAdornment: (
                                                    <LanguageIcon
                                                        sx={{
                                                            mr: 1.5,
                                                            color: "text.disabled",
                                                            fontSize: 20,
                                                        }}
                                                    />
                                                ),
                                            }}
                                        />
                                    </Stack>
                                </CardContent>
                            </StyledCard>
                        </Grow>
                    </Grid>

                    {/* Matching Rules */}
                    <Grid size={{ xs: 12, md: 6 }}>
                        <Grow in timeout={450} style={{ transitionDuration: setting.enableAnimations ? undefined : '0ms' }}>
                            <StyledCard sx={{ height: "100%" }}>
                                <CardContent sx={{ p: 3 }}>
                                    <SectionHeader>
                                        <SectionIcon>
                                            <RuleIcon fontSize="small" />
                                        </SectionIcon>
                                        <Typography variant="h6" fontWeight={700} fontSize="1rem">
                                            URL Matching
                                        </Typography>
                                    </SectionHeader>
                                    <StyledTextField
                                        label="Regex Pattern"
                                        variant="outlined"
                                        fullWidth
                                        placeholder="e.g., /video/.*"
                                        helperText="Optional: Filter specific URLs on this hostname"
                                        value={configRegexPettern}
                                        onChange={(e) => setConfigRegexPettern(e.target.value)}
                                        InputProps={{
                                            startAdornment: (
                                                <CodeIcon
                                                    sx={{ mr: 1.5, color: "text.disabled", fontSize: 20 }}
                                                />
                                            ),
                                        }}
                                    />
                                </CardContent>
                            </StyledCard>
                        </Grow>
                    </Grid>
                </Grid>

                {/* Fetching Strategy - Full Width Below */}
                <Grid container>
                    <Grid size={12}>
                        <Grow in timeout={600} style={{ transitionDuration: setting.enableAnimations ? undefined : '0ms' }}>
                            <StyledCard>
                                <CardContent sx={{ p: 3 }}>
                                    <SectionHeader>
                                        <SectionIcon>
                                            <TuneIcon fontSize="small" />
                                        </SectionIcon>
                                        <Typography variant="h6" fontWeight={700} fontSize="1rem">
                                            Fetching Strategy
                                        </Typography>
                                    </SectionHeader>

                                    {/* Mode Selector */}
                                    <ModeSelector>
                                        <ModeButton
                                            active={configMode === "page"}
                                            onClick={() => setConfigMode("page")}
                                            startIcon={<LanguageIcon />}
                                        >
                                            Page Mode
                                        </ModeButton>
                                        <ModeButton
                                            active={configMode === "fast"}
                                            onClick={() => setConfigMode("fast")}
                                            startIcon={<TextFieldsIcon />}
                                        >
                                            Fast Mode
                                        </ModeButton>
                                    </ModeSelector>

                                    {/* Simple & Open Simple Mode */}
                                    <Collapse in={configMode === "fast" || configMode === "page"} timeout={setting.enableAnimations ? undefined : 0}>
                                        <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
                                            {/* Selector Type Buttons */}
                                            <Box>
                                                <Typography
                                                    variant="subtitle2"
                                                    color="text.secondary"
                                                    sx={{ mb: 1.5, fontWeight: 600 }}
                                                >
                                                    Selector Type
                                                </Typography>
                                                <Stack direction="row" spacing={1}>
                                                    {(["regex", "css", "xpath"] as SelectorType[]).map(
                                                        (type) => (
                                                            <SelectorTypeButton
                                                                key={type}
                                                                active={configSelectorType === type}
                                                                onClick={() => {
                                                                    setConfigSelectorType(type);
                                                                    setConfigSelector(selectorValues[type].selector);
                                                                    setConfigAttribute(selectorValues[type].attribute);
                                                                }}
                                                            >
                                                                {type.toUpperCase()}
                                                            </SelectorTypeButton>
                                                        )
                                                    )}
                                                </Stack>
                                            </Box>
                                            
                                            {configMode === "page" && (
                                                <Box>
                                                    <Typography
                                                        variant="subtitle2"
                                                        color="text.secondary"
                                                        sx={{ mb: 1.5, fontWeight: 600 }}
                                                    >
                                                        Result Type
                                                    </Typography>
                                                    <FormControl fullWidth size="small">
                                                        <Select
                                                            value={configResultType}
                                                            onChange={(e) => setConfigResultType(e.target.value as ResultType)}
                                                            sx={{ borderRadius: 2 }}
                                                        >
                                                            <MenuItem value="cover_url">
                                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                                                    <PhotoIcon fontSize="small" color="primary" />
                                                                    <Box>
                                                                        <Typography variant="body2" fontWeight={500}>Cover URL</Typography>
                                                                        <Typography variant="caption" color="text.secondary">Extracts a direct image link</Typography>
                                                                    </Box>
                                                                </Box>
                                                            </MenuItem>
                                                            <MenuItem value="video_url">
                                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                                                    <OndemandVideoIcon fontSize="small" color="primary" />
                                                                    <Box>
                                                                        <Typography variant="body2" fontWeight={500}>Video URL</Typography>
                                                                        <Typography variant="caption" color="text.secondary">Captures the first frame of the video</Typography>
                                                                    </Box>
                                                                </Box>
                                                            </MenuItem>
                                                        </Select>
                                                    </FormControl>
                                                </Box>
                                            )}

                                            {configSelectorType === "css" && (
                                                <StyledTextField
                                                    label="Attribute"
                                                    variant="outlined"
                                                    fullWidth
                                                    placeholder="e.g., src, content, href"
                                                    helperText="The attribute to extract from matched elements"
                                                    value={configAttribute}
                                                    onChange={(e) => {
                                                        const newValue = e.target.value;
                                                        setConfigAttribute(newValue);
                                                        setSelectorValues((prev) => ({
                                                            ...prev,
                                                            [configSelectorType]: {
                                                                ...prev[configSelectorType],
                                                                attribute: newValue,
                                                            },
                                                        }));
                                                    }}
                                                />
                                            )}

                                            <StyledTextField
                                                label={
                                                    configSelectorType === "regex"
                                                        ? "Regex Pattern"
                                                        : configSelectorType === "css"
                                                            ? "CSS Selector"
                                                            : "XPath Expression"
                                                }
                                                variant="outlined"
                                                fullWidth
                                                multiline={configSelectorType !== "regex"}
                                                minRows={2}
                                                placeholder={
                                                    configSelectorType === "regex"
                                                        ? '"thumbnailUrl":"(.*?)"'
                                                        : configSelectorType === "css"
                                                            ? 'meta[property="og:image"]'
                                                            : '//meta[@property="og:image"]/@content'
                                                }
                                                helperText={
                                                    configSelectorType === "regex"
                                                        ? "Use capture groups to extract content"
                                                        : configSelectorType === "css"
                                                            ? "Standard CSS selector syntax"
                                                            : "XPath expression to match elements"
                                                }
                                                value={configSelector}
                                                onChange={(e) => {
                                                    const newValue = e.target.value;
                                                    setConfigSelector(newValue);
                                                    setSelectorValues((prev) => ({
                                                        ...prev,
                                                        [configSelectorType]: {
                                                            ...prev[configSelectorType],
                                                            selector: newValue,
                                                        },
                                                    }));
                                                }}
                                            />
                                        </Box>
                                    </Collapse>
                                </CardContent>
                            </StyledCard>
                        </Grow>
                    </Grid>
                </Grid>
            </Stack>
        </Box>
    );
}
