import React from "react";
import { createRoot } from "react-dom/client";
import App from "./routes/App";
import { AuthProvider } from "./store/authStore";
import "./styles/global.css";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>
);
