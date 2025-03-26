import React, { useState, useEffect } from "react";
import API from "../api";
import {
  Table,
  Button,
  Form,
  Alert,
  Container,
  Spinner,
} from "react-bootstrap";
import {
  FaTrash,
  FaPlus,
  FaDownload,
  FaExclamationTriangle,
  FaEnvelope,
  FaBoxOpen,
} from "react-icons/fa";

const Inventory = () => {
  const [inventory, setInventory] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [newItem, setNewItem] = useState({
    batch_no: "",
    quantity: "",
    expiry_date: "",
    status: "",
  });
  const [message, setMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [sending, setSending] = useState(false);
  const [showAlerts, setShowAlerts] = useState(false);

  const [orderQty, setOrderQty] = useState("");
  const [fulfillMessage, setFulfillMessage] = useState("");
  const [usedBatches, setUsedBatches] = useState([]);

  useEffect(() => {
    fetchInventory();
    fetchStatuses();
    fetchAlerts();
  }, []);

  const fetchInventory = () => {
    API.get("/inventory")
      .then((res) => setInventory(res.data))
      .catch((err) => console.error("❌ Error fetching inventory:", err));
  };

  const fetchStatuses = () => {
    API.get("/inventory/statuses")
      .then((res) => setStatuses(["All", ...res.data]))
      .catch((err) => {
        console.error("❌ Error fetching statuses:", err);
        setStatuses(["All", "Available", "Expired", "Reserved", "Out of Stock"]);
      });
  };

  const fetchAlerts = () => {
    setLoading(true);
    API.get("/inventory")
      .then((res) => {
        const critical = res.data.filter(
          (item) => item.quantity < 10 || item.status === "Expired"
        );
        setAlerts(critical);
        setShowAlerts(true);
        setMessage("✅ Alerts fetched successfully.");
      })
      .catch((err) => {
        console.error("❌ Error fetching alerts:", err);
        setMessage("❌ Failed to fetch alerts.");
      })
      .finally(() => setLoading(false));
  };

  const sendAlertsToManager = () => {
    setSending(true);
    API.post("/inventory/send-alerts")
      .then((res) => setMessage(res.data.message))
      .catch((err) => {
        console.error("❌ Failed to send alert email:", err);
        setMessage("❌ Failed to send alert email.");
      })
      .finally(() => setSending(false));
  };

  const handleAdd = () => {
    if (!newItem.batch_no || !newItem.quantity || !newItem.expiry_date || !newItem.status) {
      setMessage("❗ Please fill in all fields.");
      return;
    }

    API.post("/inventory", newItem)
      .then(() => {
        fetchInventory();
        setNewItem({ batch_no: "", quantity: "", expiry_date: "", status: "" });
        setMessage("✅ Item added successfully!");
      })
      .catch((err) => {
        console.error("❌ Error adding item:", err);
        setMessage("❌ Failed to add item.");
      });
  };

  const handleDelete = (id) => {
    API.delete(`/inventory/${id}`)
      .then(() => {
        setInventory(inventory.filter((item) => item.inventory_id !== id));
        setMessage("🗑️ Item deleted successfully!");
      })
      .catch((err) => {
        console.error("❌ Error deleting item:", err);
        setMessage("❌ Failed to delete item.");
      });
  };

  const handleDownload = () => {
    setDownloading(true);
    API.get("/inventory/download-report", { responseType: "blob" })
      .then((response) => {
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", "inventory_report.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setMessage("✅ Inventory report downloaded!");
      })
      .catch((error) => {
        console.error("❌ Error downloading report:", error);
        setMessage("❌ Failed to download report.");
      })
      .finally(() => setDownloading(false));
  };

  const handleFulfillOrder = () => {
    if (!orderQty || isNaN(orderQty) || Number(orderQty) <= 0) {
      setFulfillMessage("❗ Please enter a valid quantity.");
      return;
    }

    API.post("/fulfill-order", { quantity: Number(orderQty) })
      .then((res) => {
        const batches = res.data.batches_used.map(
          (b) => `Batch ${b.batch_no} - ${b.used} units`
        ).join(", ");
        setFulfillMessage(`✅ Order fulfilled using: ${batches}`);
        setUsedBatches(res.data.batches_used);
        setOrderQty(""); // reset input
        fetchInventory(); // refresh
      })
      .catch((err) => {
        console.error("❌ Fulfill Order Error:", err);
        setFulfillMessage("❌ Failed to fulfill the order.");
      });
  };

  const filteredInventory = inventory.filter((item) => {
    const batch = item.batch_no ? item.batch_no.toLowerCase() : "";
    const search = searchTerm.toLowerCase();
    const matchesSearch = batch.includes(search);
    const matchesStatus = selectedStatus === "All" || item.status === selectedStatus;
    return matchesSearch && matchesStatus;
  });

  return (
    <Container className="mt-4">
        <div className="container" style={{ paddingTop: "65px" }}></div>
      <h2 className="mb-3 text-center">📦 Inventory Management</h2>

      {message && (
        <Alert variant="info" onClose={() => setMessage("")} dismissible>
          {message}
        </Alert>
      )}

      {/* ✅ Fulfill Order Section */}
      <div className="my-4">
        <h5>
          <FaBoxOpen className="me-2" />
          Fulfill Order (First-In-First-Out)
        </h5>
        <div className="d-flex gap-2 mb-2">
          <Form.Control
            type="number"
            value={orderQty}
            placeholder="Enter quantity to fulfill"
            onChange={(e) => setOrderQty(e.target.value)}
            style={{ maxWidth: "250px" }}
          />
          <Button onClick={handleFulfillOrder} variant="primary">
            📤 Fulfill Order
          </Button>
        </div>
        {fulfillMessage && (
          <Alert variant="info">{fulfillMessage}</Alert>
        )}

        {usedBatches.length > 0 && (
          <Table striped bordered>
            <thead>
              <tr>
                <th>Batch No</th>
                <th>Used Quantity</th>
              </tr>
            </thead>
            <tbody>
              {usedBatches.map((b) => (
                <tr key={b.batch_no}>
                  <td>{b.batch_no}</td>
                  <td>{b.used}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </div>

      {/* 🔍 Search & Filter */}
      <Form className="mb-4 d-flex flex-wrap gap-2">
        <Form.Control
          type="text"
          placeholder="🔍 Search by Batch No..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="me-2"
        />
        <Form.Select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          style={{ maxWidth: "200px" }}
        >
          {statuses.map((status, idx) => (
            <option key={idx} value={status}>
              {status}
            </option>
          ))}
        </Form.Select>
      </Form>

      {/* ➕ Add New Item */}
      <h5>Add New Item</h5>
      <Form className="mb-4">
        <Form.Group className="mb-2">
          <Form.Control
            type="text"
            placeholder="Batch No"
            value={newItem.batch_no}
            onChange={(e) => setNewItem({ ...newItem, batch_no: e.target.value })}
          />
        </Form.Group>
        <Form.Group className="mb-2">
          <Form.Control
            type="number"
            placeholder="Quantity"
            value={newItem.quantity}
            onChange={(e) => setNewItem({ ...newItem, quantity: e.target.value })}
          />
        </Form.Group>
        <Form.Group className="mb-2">
          <Form.Control
            type="date"
            value={newItem.expiry_date}
            onChange={(e) => setNewItem({ ...newItem, expiry_date: e.target.value })}
          />
        </Form.Group>
        <Form.Group className="mb-2">
          <Form.Select
            value={newItem.status}
            onChange={(e) => setNewItem({ ...newItem, status: e.target.value })}
          >
            <option value="">Select Status</option>
            {statuses.filter((s) => s !== "All").map((status, idx) => (
              <option key={idx} value={status}>
                {status}
              </option>
            ))}
          </Form.Select>
        </Form.Group>
        <Button variant="success" onClick={handleAdd}>
          <FaPlus /> Add Item
        </Button>
      </Form>

      {/* ⚠️ Alerts */}
      {showAlerts && (
        <>
          <h5 className="mt-4 d-flex justify-content-between align-items-center">
            ⚠️ Inventory Alerts
            <Button
              variant="outline-danger"
              size="sm"
              onClick={() => setShowAlerts(false)}
              title="Close Alerts"
            >
              ❌
            </Button>
          </h5>

          {loading ? (
            <Spinner animation="border" />
          ) : alerts.length > 0 ? (
            <Table striped bordered hover responsive>
              <thead className="table-danger">
                <tr>
                  <th>Batch No</th>
                  <th>Quantity</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {alerts.map((item) => (
                  <tr key={item.batch_no}>
                    <td>{item.batch_no}</td>
                    <td>{item.quantity}</td>
                    <td>{item.status}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          ) : (
            <p>No alerts found.</p>
          )}
        </>
      )}

      {/* 📋 Inventory Table */}
      <Table striped bordered hover responsive>
        <thead className="table-dark">
          <tr>
            <th>Batch No</th>
            <th>Quantity</th>
            <th>Expiry Date</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {filteredInventory.length > 0 ? (
            filteredInventory.map((item) => (
              <tr key={item.inventory_id}>
                <td>{item.batch_no}</td>
                <td>{item.quantity}</td>
                <td>{new Date(item.expiry_date).toLocaleDateString()}</td>
                <td>{item.status}</td>
                <td>
                  <Button
                    variant="danger"
                    onClick={() => handleDelete(item.inventory_id)}
                  >
                    <FaTrash /> Delete
                  </Button>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="5" className="text-center">
                No items match the current filters.
              </td>
            </tr>
          )}
        </tbody>
      </Table>

      {/* 🔽 Actions */}
      <div className="mt-3 d-flex gap-2">
        <Button variant="warning" onClick={fetchAlerts}>
          <FaExclamationTriangle /> Check Alerts
        </Button>
        <Button variant="info" onClick={sendAlertsToManager} disabled={sending}>
          {sending ? <Spinner animation="border" size="sm" /> : <FaEnvelope />} Send Alert Email
        </Button>
        <Button variant="success" onClick={handleDownload} disabled={downloading}>
          {downloading ? <Spinner animation="border" size="sm" /> : <FaDownload />} Download Report
        </Button>
      </div>
    </Container>
  );
};

export default Inventory;
