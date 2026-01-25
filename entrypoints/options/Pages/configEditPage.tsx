import { useStore } from "../store/index";
import { useState, useEffect } from "react";

import { Box, TextField, Typography, Button, Toolbar } from "@mui/material";

import { useMediaQuery, useTheme } from "@mui/material";

import { useNavigate, useParams } from "react-router-dom";

import CodeMirror from "@uiw/react-codemirror";
import { javascript } from "@codemirror/lang-javascript";
import { okaidia } from "@uiw/codemirror-theme-okaidia";
import { autocompletion } from "@codemirror/autocomplete";

import { FetchConfig } from "@/entrypoints/global/types";

export function ConfigEditPage() {
  const [configName, setConfigName] = useState<string>("");
  const [configHostname, setConfigHostname] = useState<string>("");
  const [configRegexPettern, setConfigRegexPettern] = useState<string>("");
  const [configScript, setConfigScript] = useState<string>("");

  const { id } = useParams();
  let isNew = false;
  if (!id) {
    isNew = true;
  }
  const configList = useStore((state) => state.fetchConfigList);
  const setFetchConfig = useStore((state) => state.setFetchConfig);

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
      setConfigScript(matchedConfig.fetchScript);
      setConfigName(matchedConfig.name);
      setConfigHostname(matchedConfig.hostname);
      const regexPattern = matchedConfig.regexPattern;
      if (regexPattern) {
        setConfigRegexPettern(regexPattern);
      }
    }
  }, []);

  // const name = matchedConfig ? matchedConfig.name : "";
  const [view, setView] = useState();

  const onCreateEditor = (view, state) => {
    setView(view);
    // 你可以在这里访问 view 和 state 实例
    // 例如：view.dispatch(...)
  };

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
    if (!configName || !configHostname || !configScript) {
      alert("Config not valid.");
      return;
    }
    const config: FetchConfig = {
      id: configId,
      name: configName,
      hostname: configHostname,
      regexPattern: configRegexPettern,
      fetchScript: configScript,
    };
    if (isNew) {
      await setFetchConfig(config, false);
    } else {
      await setFetchConfig(config, true);
    }

    // TODO: Add dialog to show "config saved".
    navigateBack();
    // await addFetchConfig(config);
  };

  return (
    <Box sx={{ p: 2 }}>
      <Box sx={{ display: "flex", flexDirection: direction, gap: 3, mb: 3 }}>
        <TextField
          label="Name"
          variant="outlined"
          fullWidth
          value={configName}
          onChange={(e) => {
            setConfigName(e.target.value);
          }}
        />
        <TextField
          label="Hostname"
          variant="outlined"
          fullWidth
          value={configHostname}
          onChange={(e) => {
            setConfigHostname(e.target.value);
          }}
        />
        <TextField
          label="Regex Pattern"
          variant="outlined"
          fullWidth
          value={configRegexPettern}
          onChange={(e) => {
            setConfigRegexPettern(e.target.value);
          }}
        />
      </Box>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
        <Typography sx={{ ml: 1, fontSize: 12 }}>Script: </Typography>
        <CodeMirror
          height="800px"
          onCreateEditor={onCreateEditor}
          extensions={[javascript({ jsx: true }), autocompletion()]}
          value={configScript}
          onChange={(value) => {
            setConfigScript(value);
          }}
        />
      </Box>
      <Box sx={{ display: "flex", justifyContent: "center", pt: 2 }}>
        <Button onClick={handleSave}>Save</Button>
      </Box>
    </Box>
  );
}
