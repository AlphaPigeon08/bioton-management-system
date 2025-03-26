import React, { useState, useEffect } from "react";
import Header from "../components/Header";
import { Form, Button, Alert } from "react-bootstrap";
import API from "../api";

const UserSettings = () => {
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [message, setMessage] = useState("");

  // ✅ Fetch current MFA status
  useEffect(() => {
    API.get("/user/mfa-status")
      .then((res) => setMfaEnabled(res.data.mfaEnabled))
      .catch((err) => {
        console.error("Failed to fetch MFA status:", err);
        setMessage("⚠️ Unable to fetch MFA status.");
      });
  }, []);

  // ✅ Handle password change
  const handlePasswordChange = async () => {
    try {
      const res = await API.post("/user/change-password", {
        oldPassword,
        newPassword,
      });
      setMessage(res.data.message);
      setOldPassword("");
      setNewPassword("");
    } catch (err) {
      console.error("Password change error:", err);
      setMessage("❌ Failed to change password. Please check your input.");
    }
  };

  // ✅ Handle MFA toggle
  const handleMfaToggle = () => {
    API.post("/user/toggle-mfa")
      .then((res) => {
        setMfaEnabled(res.data.mfaEnabled);
        setMessage(res.data.message);
      })
      .catch((err) => {
        console.error("Toggle MFA Error:", err);
        setMessage("❌ Failed to toggle MFA.");
      });
  };

  return (
    <>
      <Header
        username="User"
        activeTab={null}
        setActiveTab={() => {}}
        showHomeOnly={true}
      />

      <div className="container" style={{ paddingTop: "80px", maxWidth: "600px" }}>
        <h3 className="text-center mb-4">⚙️ User Settings</h3>

        {message && <Alert variant="info">{message}</Alert>}

        <h5 className="mb-3">🔑 Change Password</h5>
        <Form.Group className="mb-3">
          <Form.Control
            type="password"
            placeholder="Old Password"
            value={oldPassword}
            onChange={(e) => setOldPassword(e.target.value)}
          />
        </Form.Group>
        <Form.Group className="mb-3">
          <Form.Control
            type="password"
            placeholder="New Password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
        </Form.Group>
        <Button variant="primary" onClick={handlePasswordChange}>
          Change Password
        </Button>

        <hr className="my-4" />

        <h5 className="mb-3">🔐 Multi-Factor Authentication</h5>
        <Button variant="warning" onClick={handleMfaToggle}>
          {mfaEnabled ? "Disable MFA" : "Enable MFA"}
        </Button>
      </div>
    </>
  );
};

export default UserSettings;
