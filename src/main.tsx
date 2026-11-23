import "./styles/global.scss";
import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./app/App";
import { restoreRoute } from "./routeBootstrap";
import ScrollToTop from "./components/ScrollToTop";

restoreRoute(window.location, window.history, import.meta.env.BASE_URL);

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL}>
    <ScrollToTop />
      <App />
    </BrowserRouter>
  </React.StrictMode>,
);
