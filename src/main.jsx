import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import App from "./App.jsx";
import ErrorBoundary from "./ErrorBoundary.jsx";

import { ThemeProvider } from "./components/Context/ThemeContext.jsx";
import { AuthProvider } from "./contexts/authContext.jsx";

import { NotificationProvider } from "./components/Context/NotificationContext.jsx";
import { ToastProvider } from './components/Context/ToastContext';

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>

        <ThemeProvider>
          <AuthProvider>
            <NotificationProvider>
              <ToastProvider>
                <App />
              </ToastProvider>
            </NotificationProvider>
          </AuthProvider>
        </ThemeProvider>

      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>
);