import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import VerifyOTP from "./pages/VerifyOTP";
import UserSettings from "./pages/UserSettings";
import TransferInventory from "./pages/TransferInventory";
import "bootstrap/dist/css/bootstrap.min.css";
import API from "./api";

// ✅ Set auth token globally
const token = localStorage.getItem("authToken") || sessionStorage.getItem("authToken");
if (token) {
  API.defaults.headers.common["Authorization"] = `Bearer ${token}`;
}

// ✅ Private Route Wrapper
const PrivateRoute = ({ children }) => {
  return token ? children : <Navigate to="/" />;
};

const App = () => {
  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Login />} />
        <Route path="/verify-otp" element={<VerifyOTP />} />

        {/* Protected Routes */}
        <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <PrivateRoute>
              <UserSettings />
            </PrivateRoute>
          }
        />
        <Route
          path="/transfer"
          element={
            <PrivateRoute>
              <TransferInventory />
            </PrivateRoute>
          }
        />
      </Routes>
    </Router>
  );
};

export default App;
