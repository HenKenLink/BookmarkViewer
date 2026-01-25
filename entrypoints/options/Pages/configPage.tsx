import { useStore } from "../store/index";
import { useState, useEffect } from "react";

import {
  Card,
  Box,
  TextField,
  Typography,
  Button,
  Toolbar,
  Checkbox,
} from "@mui/material";

import { Link, replace } from "react-router-dom";
import { styled } from "@mui/material/styles";

import { CardItem, BoxItem } from "../Components/PageItem";

import { useNavigate } from "react-router-dom";
import { grey } from "@mui/material/colors";

import { PAGE_ITEM_SX } from "../consts";

//  component={Link} to={`/config/${config.id}`}

export function ConfigPage() {
  const [isMutiSelect, setIsMutiSelect] = useState<boolean>(false);
  const [selectedItemList, setSelectedItemList] = useState<number[]>([]);

  const configList = useStore((state) => state.fetchConfigList);
  const delFetchConfig = useStore((state) => state.delFetchConfig);
  const navigate = useNavigate();

  const configPageNavigate = (id: number) => {
    navigate(`/config/${id}`);
  };

  const toggleDisplay = isMutiSelect ? "flex" : "none";

  return (
    <Box>
      <BoxItem sx={{ gap: 1 }} justifyContent={"space-between"}>
        <Box sx={{ display: "flex", gap: 1 }}>
          <Button
            onClick={() => {
              navigate(`/config/new`);
            }}
          >
            Add
          </Button>
          <Button
            color={isMutiSelect ? "warning" : "success"}
            onClick={() => {
              setIsMutiSelect(!isMutiSelect);
              if (!isMutiSelect) {
                setSelectedItemList([]);
              }
            }}
          >
            {isMutiSelect ? "Cancel" : "Select"}
          </Button>
        </Box>

        <Box display={toggleDisplay}>
          <Button
            color="error"
            onClick={async () => {
              console.log("selectedItemList: ", selectedItemList);
              await delFetchConfig(selectedItemList);
            }}
          >
            Delete
          </Button>
        </Box>
      </BoxItem>
      {configList.map((config) => {
        const id = config.id;
        return (
          <CardItem
            key={id}
            sx={{ p: 2, cursor: "pointer" }}
            onClick={() => configPageNavigate(id)}
          >
            <Box sx={{ width: "100%" }}>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                }}
              >
                <Box display="flex" alignItems="center">
                  <Box display={toggleDisplay}>
                    <Checkbox
                      sx={{ mb: 1 }}
                      onClick={(e) => {
                        e.stopPropagation();
                      }}
                      onChange={(e) => {
                        const isChecked: boolean = e.target.checked;
                        if (isChecked) {
                          setSelectedItemList((prev) => [...prev, id]);
                        } else {
                          setSelectedItemList((prev) =>
                            prev.filter((item) => item !== id)
                          );
                        }
                      }}
                    />
                  </Box>

                  <Typography
                    className="card-title"
                    sx={{ textAlign: "center" }}
                  >
                    {config.name}
                  </Typography>
                </Box>

                <Typography sx={{}}>id: {id}</Typography>
              </Box>

              <Box sx={{ pt: 1 }}>
                <Typography>
                  hostname: <span>{config.hostname}</span>
                </Typography>
                <Typography>
                  Regex:{" "}
                  <span style={{ textDecoration: "underline" }}>
                    {config.regexPattern}
                  </span>
                </Typography>
              </Box>
            </Box>
          </CardItem>
        );
      })}
    </Box>
  );
}
