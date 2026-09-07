import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter } from "react-router-dom";
import App from "./App.jsx";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    {/* HashRouter: nessun 404.html da tenere sincronizzato su hosting statico
        (GitHub Pages). Vedi docs/deploy.md. */}
    <HashRouter>
      <App />
    </HashRouter>
  </React.StrictMode>
);
