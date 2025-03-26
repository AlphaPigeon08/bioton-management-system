import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import styled from "styled-components";
import API from "../api";

const Container = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 100vh;
  background: linear-gradient(135deg, #1e3c72, #2a5298);
`;

const Box = styled.div`
  background: white;
  padding: 2rem;
  border-radius: 10px;
  width: 350px;
  box-shadow: 0px 4px 10px rgba(0, 0, 0, 0.2);
  text-align: center;
`;

const Title = styled.h2`
  color: #2a5298;
`;

const Input = styled.input`
  width: 100%;
  padding: 10px;
  margin: 1rem 0;
  font-size: 16px;
  border-radius: 5px;
  border: 1px solid #ccc;
`;

const Button = styled.button`
  width: 100%;
  background: #2a5298;
  color: white;
  padding: 10px;
  font-size: 16px;
  border: none;
  border-radius: 5px;
  cursor: pointer;

  &:hover {
    background: #1e3c72;
  }
`;

const Message = styled.p`
  color: ${(props) => (props.error ? "red" : "green")};
  font-size: 14px;
`;

const VerifyOTP = () => {
  const [otp, setOtp] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleVerify = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const tempToken = localStorage.getItem("tempToken");
      const email = localStorage.getItem("emailForOTP");

      if (!tempToken || !email) {
        setMessage("❌ Session expired. Please log in again.");
        return;
      }

      const res = await API.post(
        "/verify-otp",
        { email, otp },
        {
          headers: {
            Authorization: `Bearer ${tempToken}`,
          },
        }
      );

      localStorage.setItem("authToken", res.data.token);
      localStorage.setItem("user", JSON.stringify(res.data.user));
      localStorage.removeItem("tempToken");
      localStorage.removeItem("emailForOTP");

      navigate("/dashboard");
    } catch (err) {
      console.error("OTP Error:", err);
      setMessage("❌ Invalid OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container>
      <Box>
        <Title>🔐 Enter OTP</Title>
        <p style={{ fontSize: "14px" }}>
          An OTP was sent to your email. Please enter it below to continue.
        </p>
        <form onSubmit={handleVerify}>
          <Input
            type="text"
            placeholder="Enter 6-digit OTP"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            required
            maxLength={6}
          />
          <Button type="submit" disabled={loading}>
            {loading ? "Verifying..." : "Verify OTP"}
          </Button>
        </form>
        {message && <Message error>{message}</Message>}
      </Box>
    </Container>
  );
};

export default VerifyOTP;
