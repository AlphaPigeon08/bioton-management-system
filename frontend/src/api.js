import axios from "axios";

// Create Axios instance with base URL
const API = axios.create({
  baseURL: "http://localhost:5001", // ✅ Update if deployed elsewhere
  headers: {
    "Content-Type": "application/json",
  },
});

// ✅ Request Interceptor: Attach token
API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("authToken") || sessionStorage.getItem("authToken");
    if (token) {
      config.headers["Authorization"] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ✅ Response Interceptor: Auto logout on expired token
API.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const errorMsg = error.response?.data?.error;

    // Only logout if token is actually expired
    if (status === 401 && errorMsg === "Token expired") {
      console.warn("🔐 JWT expired. Logging out user.");

      localStorage.removeItem("authToken");
      sessionStorage.removeItem("authToken");
      localStorage.removeItem("user");

      // Optional: Toast/snackbar message before redirect
      alert("Your session has expired. Please log in again.");

      // Redirect to login page
      window.location.href = "/";
    }

    return Promise.reject(error);
  }
);

export default API;
