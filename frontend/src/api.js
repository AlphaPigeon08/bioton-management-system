import axios from "axios";

// Create Axios instance with base URL
const API = axios.create({
  baseURL: "http://localhost:5001", // ✅ Update if deployed elsewhere
  headers: {
    "Content-Type": "application/json",
  },
});

// ✅ Request Interceptor: Add auth token if present
API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("authToken") || sessionStorage.getItem("authToken");
    if (token) {
      config.headers["Authorization"] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// ✅ Optional Response Interceptor: Handle expired or invalid token
API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      console.warn("⚠️ Unauthorized: Logging out user.");
      localStorage.removeItem("authToken");
      sessionStorage.removeItem("authToken");
      localStorage.removeItem("user");
      window.location.href = "/"; // Force logout to login page
    }
    return Promise.reject(error);
  }
);

export default API;
