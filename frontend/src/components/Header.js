import React from "react";
import { Navbar, Nav, Dropdown, Container } from "react-bootstrap";
import { FaUserCircle } from "react-icons/fa";
import { useNavigate, useLocation } from "react-router-dom";
import logo from "../assets/logo.jpeg";
import API from "../api";

const Header = ({ username, activeTab, setActiveTab }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    localStorage.removeItem("authToken");
    sessionStorage.removeItem("authToken");
    localStorage.removeItem("user");
    delete API.defaults.headers.common["Authorization"];
    navigate("/");
  };

  const handleSettings = () => {
    navigate("/settings");
  };

  const isDashboard = location.pathname === "/dashboard";
  const isSettings = location.pathname === "/settings";

  return (
    <Navbar
      fixed="top"
      bg="light"
      variant="light"
      className="shadow-sm px-4 py-2"
      style={{ zIndex: 1030 }}
    >
      <Container fluid>
        {/* Logo + Branding */}
        <Navbar.Brand href="/dashboard" className="d-flex align-items-center">
          <img
            src={logo}
            alt="Bioton Logo"
            width="50"
            height="50"
            className="me-2"
          />
          <span className="fw-bold text-dark">Bioton Management</span>
        </Navbar.Brand>

        <Navbar.Toggle aria-controls="navbar-nav" />
        <Navbar.Collapse id="navbar-nav">
          <Nav className="ms-auto align-items-center">
            {/* Full tabs for dashboard */}
            {isDashboard && setActiveTab && (
              <div className="d-flex align-items-center me-3 flex-wrap gap-2">
                <button
                  onClick={() => setActiveTab("welcome")}
                  className={`btn btn-sm ${
                    activeTab === "welcome" ? "btn-primary" : "btn-outline-primary"
                  }`}
                >
                  🏠 Home
                </button>
                <button
                  onClick={() => setActiveTab("inventory")}
                  className={`btn btn-sm ${
                    activeTab === "inventory" ? "btn-secondary" : "btn-outline-secondary"
                  }`}
                >
                  📦 Inventory
                </button>
                <button
                  onClick={() => setActiveTab("orders")}
                  className={`btn btn-sm ${
                    activeTab === "orders" ? "btn-info" : "btn-outline-info"
                  }`}
                >
                  📜 Orders
                </button>
                <button
                  onClick={() => setActiveTab("exceptions")}
                  className={`btn btn-sm ${
                    activeTab === "exceptions" ? "btn-danger" : "btn-outline-danger"
                  }`}
                >
                  ⚠️ Exceptions
                </button>
                <button
                  onClick={() => setActiveTab("insulin")}
                  className={`btn btn-sm ${
                    activeTab === "insulin" ? "btn-success" : "btn-outline-success"
                  }`}
                >
                  💉 Insulin
                </button>
              </div>
            )}

            {/* Single Home button for settings page */}
            {isSettings && (
              <div className="d-flex align-items-center me-3">
                <button
                  onClick={() => navigate("/dashboard")}
                  className="btn btn-sm btn-outline-primary"
                >
                  🏠 Home
                </button>
              </div>
            )}

            {/* User Dropdown */}
            <Dropdown align="end">
              <Dropdown.Toggle variant="dark" id="dropdown-user" size="sm">
                <FaUserCircle className="me-2" />
                {username || "User"}
              </Dropdown.Toggle>

              <Dropdown.Menu>
                <Dropdown.Item onClick={handleSettings}>⚙️ Settings</Dropdown.Item>
                <Dropdown.Divider />
                <Dropdown.Item onClick={handleLogout}>🚪 Logout</Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown>
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
};

export default Header;
