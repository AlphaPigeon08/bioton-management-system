import React from "react";
import { Navbar, Nav, Container, NavDropdown } from "react-bootstrap";
import { FaUserCircle } from "react-icons/fa";
import { useNavigate, useLocation } from "react-router-dom";
import logo from "../assets/logo.jpeg";
import API from "../api";

const Header = ({ username, activeTab, setActiveTab }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const isDashboard = location.pathname === "/dashboard";
  const isTransfer = location.pathname === "/transfer";
  const isSettings = location.pathname === "/settings";

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

  const goToDashboardTab = (tabName) => {
    if (location.pathname !== "/dashboard") {
      navigate("/dashboard", { state: { tab: tabName } });
    } else {
      if (setActiveTab) setActiveTab(tabName);
    }
  };

  return (
    <Navbar expand="lg" fixed="top" bg="white" variant="light" className="shadow-sm px-4 py-2 border-bottom">
      <Container fluid>
        {/* Logo and Brand */}
        <Navbar.Brand href="/dashboard" className="d-flex align-items-center">
          <img src={logo} alt="Bioton Logo" width="45" height="45" className="me-2 rounded" />
          <span className="fw-bold fs-5 text-primary">Bioton Management</span>
        </Navbar.Brand>

        <Navbar.Toggle aria-controls="responsive-navbar-nav" />

        <Navbar.Collapse id="responsive-navbar-nav">
          <Nav className="ms-auto align-items-center gap-2">
            {(isDashboard || isTransfer) && (
              <>
                <button
                  onClick={() => goToDashboardTab("welcome")}
                  className={`btn btn-sm ${activeTab === "welcome" && isDashboard ? "btn-primary" : "btn-outline-primary"}`}
                >
                  🏠 Dashboard
                </button>
                <button
                  onClick={() => goToDashboardTab("inventory")}
                  className={`btn btn-sm ${activeTab === "inventory" && isDashboard ? "btn-secondary" : "btn-outline-secondary"}`}
                >
                  📦 Inventory
                </button>
                <button
                  onClick={() => goToDashboardTab("orders")}
                  className={`btn btn-sm ${activeTab === "orders" && isDashboard ? "btn-info" : "btn-outline-info"}`}
                >
                  📄 Orders
                </button>
                <button
                  onClick={() => goToDashboardTab("exceptions")}
                  className={`btn btn-sm ${activeTab === "exceptions" && isDashboard ? "btn-danger" : "btn-outline-danger"}`}
                >
                  ⚠️ Exceptions
                </button>
                <button
                  onClick={() => goToDashboardTab("insulin")}
                  className={`btn btn-sm ${activeTab === "insulin" && isDashboard ? "btn-success" : "btn-outline-success"}`}
                >
                  💉 Insulin
                </button>
                <button
                  onClick={() => navigate("/transfer")}
                  className={`btn btn-sm ${isTransfer ? "btn-warning" : "btn-outline-warning"}`}
                >
                  🔁 Transfers
                </button>
              </>
            )}

            {isSettings && (
              <button
                onClick={() => navigate("/dashboard")}
                className="btn btn-sm btn-outline-primary"
              >
                🏠 Dashboard
              </button>
            )}

            {/* User Dropdown */}
            <NavDropdown
              align="end"
              title={
                <span>
                  <FaUserCircle className="me-2" />
                  {username || "User"}
                </span>
              }
              id="user-nav-dropdown"
            >
              <NavDropdown.Item onClick={handleSettings}>⚙️ Settings</NavDropdown.Item>
              <NavDropdown.Divider />
              <NavDropdown.Item onClick={handleLogout}>🚪 Logout</NavDropdown.Item>
            </NavDropdown>
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
};

export default Header;
