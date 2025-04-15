import React, { useState, useEffect } from "react";
import Header from "../components/Header";
import { Modal, Form, Button, Alert } from "react-bootstrap";
import API from "../api";

const UserSettings = () => {
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [message, setMessage] = useState("");
  const user = JSON.parse(localStorage.getItem("user"));
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState(user.role)
  const [isAdminorWarehouseManager] = useState(role === "Admin" || role === "Warehouse_Manager");
  const [showUserListModal, setShowUserListModal] = useState(false);
  const [userList, setUserList] = useState([]);

  // ✅ Fetch All Users
  const fetchUsers = async () => {
    try {
      const res = await API.get("/user/list");
      setUserList(res.data);
      setShowUserListModal(true);  // Open modal on success
    } catch (err) {
      console.error("❌ Failed to fetch user list:", err);
      setMessage("❌ Could not load user list.");
    }
  };
  
  
  // role = user.role
  // isAdminorWarehouseManager = (role === "Admin") || (role === "Warehouse_Manager")
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

  // ✅ Handle Adding new Users
  const handleAddUser = async () => {
  try {
    const res = await API.post("/user/add-user", {
      name,
      email,
      password,
      role,
    });

    setMessage(res.data.message);
    // Clear form fields after success
    setName("");
    setEmail("");
    setPassword("");
    setRole("");
  } catch (err) {
    console.error("User creation error:", err);
    const errorMsg =
      err.response?.data?.error || "❌ Failed to add user. Please try again.";
    setMessage(errorMsg);
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

        
        <>
        
        {isAdminorWarehouseManager && (
          <div className="userAdd">
            <h5 className="mb-3 mt-5">👥 Add User</h5>
            <Button variant="primary" onClick={() => setShowModal(true)}>
              ➕ Add User
            </Button>

            <div className="mt-4">
              <h5>📋 User Directory</h5>
              <Button variant="info" onClick={fetchUsers}>
                👀 View All Users
              </Button>
            </div>
          </div>
        )}

        <Modal show={showModal} onHide={() => setShowModal(false)} centered>
          <Modal.Header closeButton>
            <Modal.Title>Add New User</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Form>
              <Form.Group className="mb-3">
                <Form.Label>👤 Name</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="Enter full name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>📧 Email</Form.Label>
                <Form.Control
                  type="email"
                  placeholder="Enter email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>🔐 Password</Form.Label>
                <Form.Control
                  type="password"
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>🧩 Role</Form.Label>
                <Form.Select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  required
                >
                  <option value="">Select role</option>
                  <option value="Admin">Admin</option>
                  <option value="WarehouseManager">Warehouse Manager</option>
                  <option value="Staff">Staff</option>
                  <option value="Viewer">Viewer</option>
                </Form.Select>
              </Form.Group>
            </Form>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowModal(false)}>
              ❌ Cancel
            </Button>
            <Button variant="success" onClick={handleAddUser}>
              ✅ Create User
            </Button>
          </Modal.Footer>
        </Modal>

        <Modal show={showUserListModal} onHide={() => setShowUserListModal(false)} centered>
          <Modal.Header closeButton>
            <Modal.Title>👥 Registered Users</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {userList.length > 0 ? (
              <div>
              <ul className="list-group mb-2">
                <li className="list-group-item d-flex justify-content-between fw-bold">
                  <span>Name</span>
                  <span>Email</span>
                  <span>MFA Enabled</span>
                </li>
              </ul>
            
              <ul className="list-group">
                {userList.map((user, index) => (
                  <li
                    key={index}
                    className="list-group-item d-flex justify-content-between align-items-center"
                  >
                    <span>{user.name}</span>
                    <span>{user.email}</span>
                    <span>{user.mfa_enabled ? "Yes" : "No"}</span>
                  </li>
                ))}
              </ul>
            </div>
            ) : (
              <p>No users found.</p>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowUserListModal(false)}>
              ❌ Close
            </Button>
          </Modal.Footer>
        </Modal>

        {message && (
          <p className="mt-3" style={{ color: message.includes("✅") ? "green" : "red" }}>
            {message}
          </p>
        )}
      </>
        
      </div>
    </>
  );
};

export default UserSettings;
