import React from "react";
import ReactDOM from "react-dom/client";
import { CssBaseline, ThemeProvider, createTheme } from "@mui/material";
import { registerSW } from "virtual:pwa-register";
import App from "./App";

const theme = createTheme({
  palette: {
    mode: "light",
    primary: { main: "#173b2b" },
    secondary: { main: "#c58b35" },
    background: { default: "#f5f6f2", paper: "#ffffff" }
  },
  shape: { borderRadius: 14 },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    button: { textTransform: "none", fontWeight: 700 }
  }
});

registerSW({ immediate: true });

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <App />
    </ThemeProvider>
  </React.StrictMode>
);
