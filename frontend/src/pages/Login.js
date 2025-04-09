import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import styled from "styled-components";
import API from "../api";
import Logo from "../assets/logo.jpeg";
import insulinBg from "../assets/insulin-bg.jpg";

const Background = styled.div`
  background-image: url(${insulinBg});
  background-size: cover;
  background-position: center;
  filter: blur(8px);
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: -2;
`;

const Overlay = styled.div`
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(2px);
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: -1;
`;

const LoginContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
  color: white;
`;

const LoginBox = styled.div`
  background: white;
  padding: 2.5rem;
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  width: 360px;
  text-align: center;
`;

const LogoImage = styled.img`
  width: 90px;
  margin-bottom: 15px;
`;

const Input = styled.input`
  width: 100%;
  padding: 12px;
  margin: 10px 0;
  border: 1px solid #ccc;
  border-radius: 8px;
  font-size: 15px;
`;

const Button = styled.button`
  width: 100%;
  padding: 12px;
  margin-top: 10px;
  background: linear-gradient(to right, #2a5298, #1e3c72);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 17px;
  font-weight: bold;
  cursor: pointer;

  &:hover {
    opacity: 0.9;
  }
`;

const ErrorMessage = styled.p`
  color: #d9534f;
  font-size: 14px;
  margin: 8px 0;
`;

const CheckboxLabel = styled.label`
  font-size: 14px;
  display: flex;
  align-items: center;
  margin-top: 8px;
  gap: 8px;
  color: #555;
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
      localStorage.getItem("authToken") || sessionStorage.getItem("authToken");
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
      <Background />
      <Overlay />

      <LoginContainer>
        <LoginBox>
          <LogoImage src={Logo} alt="Logo" />
          <h3 style={{ color: "#1e3c72", fontWeight: "bold", marginBottom: "6px" }}>
            Bioton Management
          </h3>
          <h5 style={{ color: "#1e3c72", marginBottom: "20px" }}>Login to continue</h5>

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
