import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import styled from "styled-components";
import API from "../api";
import Logo from "../assets/logo.jpeg";
import insulinBg from "../assets/insulin-bg.jpg";

// ✅ Background image container with blur
const Background = styled.div`
  background-image: url(${insulinBg});
  background-size: cover;
  background-position: center;
  filter: blur(6px);
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: -2;
`;

// ✅ Dark overlay to enhance readability
const Overlay = styled.div`
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(3px);
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: -1;
`;

// ✅ Login container
const LoginContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
  color: white;
`;

// ✅ Login box
const LoginBox = styled.div`
  background: white;
  padding: 2rem;
  border-radius: 10px;
  box-shadow: 0px 4px 10px rgba(0, 0, 0, 0.2);
  width: 350px;
  text-align: center;
`;

const LogoImage = styled.img`
  width: 80px;
  margin-bottom: 20px;
`;

const Input = styled.input`
  width: 100%;
  padding: 10px;
  margin: 10px 0;
  border: 1px solid #ddd;
  border-radius: 5px;
  font-size: 16px;
`;

const Button = styled.button`
  width: 100%;
  padding: 10px;
  margin-top: 10px;
  background: #2a5298;
  color: white;
  border: none;
  border-radius: 5px;
  font-size: 18px;
  cursor: pointer;

  &:hover {
    background: #1e3c72;
  }
`;

const ErrorMessage = styled.p`
  color: red;
  font-size: 14px;
`;

const CheckboxLabel = styled.label`
  font-size: 14px;
  display: flex;
  align-items: center;
  margin-top: 10px;
  gap: 10px;
  color: #333;
`;

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const token =
      localStorage.getItem("authToken") ||
      sessionStorage.getItem("authToken");

    if (token && location.pathname === "/") {
      navigate("/dashboard");
    }
  }, [navigate, location.pathname]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const response = await API.post("/login", { email, password });

      if (response.data.requiresOtp) {
        localStorage.setItem("tempToken", response.data.tempToken);
        localStorage.setItem("emailForOTP", email);
        navigate("/verify-otp");
      } else {
        const token = response.data.token;
        const user = response.data.user;

        if (rememberMe) {
          localStorage.setItem("authToken", token);
        } else {
          sessionStorage.setItem("authToken", token);
        }

        localStorage.setItem("user", JSON.stringify(user));
        API.defaults.headers.common["Authorization"] = `Bearer ${token}`;

        navigate("/dashboard");
      }
    } catch (error) {
      console.error("Login failed:", error);
      if (error.response?.status === 401) {
        setError("❌ Invalid email or password.");
      } else {
        setError("❌ Something went wrong. Please try again later.");
      }
    }
  };

  return (
    <>
      {/* ✅ Background Image & Overlay */}
      <Background />
      <Overlay />

      <LoginContainer>
        <LoginBox>
        <LogoImage src={Logo} alt="Logo" />
<h3 style={{ color: "#2a5298", fontWeight: "bold", marginBottom: "5px" }}>
  Bioton S A
</h3>
<h4 style={{ color: "#2a5298", marginBottom: "20px" }}>Login</h4>
          {error && <ErrorMessage>{error}</ErrorMessage>}
          <form onSubmit={handleLogin}>
            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <CheckboxLabel>
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              Remember Me
            </CheckboxLabel>
            <Button type="submit">Login</Button>
          </form>
        </LoginBox>
      </LoginContainer>
    </>
  );
};

export default Login;
