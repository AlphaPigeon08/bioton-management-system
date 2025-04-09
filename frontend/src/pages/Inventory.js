import React, { useState, useEffect,useCallback } from "react";
import API from "../api";
import {
  Container,
  Table,
  Button,
  Form,
  Alert,
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
  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [newItem, setNewItem] = useState({
    batch_no: "",
    quantity: "",
    expiry_date: "",
    status: "",
    product_id:"",
    warehouse_id:"",
  });
  const [message, setMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [sending, setSending] = useState(false);
  const [showAlerts, setShowAlerts] = useState(false);
  const [showSelectedTable, setShowSelectedTable] = useState(false);

  const [selectedOrderId, setSelectedOrderId] = useState("");
  const [pendingOrders, setPendingOrders] = useState([]);
  const [fulfillMessage, setFulfillMessage] = useState("");
  const [usedBatches, setUsedBatches] = useState([]);
  //const [transfers, setTransfers] = useState([]);

  
//const [transfers, setTransfers] = useState([]);
  //const [summaryStats, setSummaryStats] = useState(null);
  //const [inventoryCount, setInventoryCount] = useState(0); 
  //const [expandedRows, setExpandedRows] = useState({});

  const fetchInventory = useCallback(() => {
    API.get("/inventory").then((res) => {
      setInventory(res.data); // No grouping, raw rows
      setLoading(false);
    });
  }, []);
  
  const fetchTransfers = async () => {
    try {
      const res = await API.get("/transfers");
      console.log("✅ Transfers fetched:", res.data);
    } catch (err) {
      console.error("❌ Failed to fetch transfers:", err);
    }
  };
  
  useEffect(() => {
    fetchInventory();
    fetchStatuses();
    fetchAlerts();
    fetchPendingOrders();
    fetchProducts();
    fetchWarehouses();
    fetchTransfers();
  }, [fetchInventory]);
  
  const fetchStatuses = () => {
    API.get("/inventory/statuses")
      .then((res) => setStatuses(["All", ...res.data]))
      .catch((err) => {
        console.error("Error fetching statuses:", err);
        setStatuses(["All", "Available", "Expired", "Reserved", "Out of Stock"]);
      });
  };
  
  const fetchAlerts = () => {
    setLoading(true);
    API.get("/inventory")
      .then((res) => {
        const alerts = res.data.filter((row) => {
          const qty = Number(row.quantity);
          const isLowStock = qty <= 5;
          const isExpired = row.status === "Expired";
          return isLowStock || isExpired;
        }).map((item) => ({
          batch_no: item.batch_no,
          product_name: item.product_name,
          warehouse_name: item.warehouse_name,
          quantity: item.quantity,
          status: item.status,
          expiry_date: item.expiry_date,
          inventory_id: item.inventory_id,
          alert_type: item.status === "Expired" ? "Expired" : "Low Stock"
        }));
  
        setAlerts(alerts);
        setShowAlerts(true);
        setMessage("✅ Alerts fetched successfully.");
      })
      .catch((err) => {
        console.error("Error fetching alerts:", err);
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
  
  const fetchProducts = () => {
    API.get("/product-insulin")
      .then((res) => setProducts(res.data))
      .catch((err) => console.error("Error fetching products:", err));
  };
  
  const fetchWarehouses = () => {
    API.get("/warehouses")
      .then((res) => setWarehouses(res.data))
      .catch((err) => console.error("Error fetching warehouses:", err));
  };
  
  const fetchPendingOrders = () => {
    API.get("/orders?status=Pending")
      .then((res) => setPendingOrders(res.data))
      .catch((err) => console.error("❌ Error fetching orders:", err));
  };
  
  const handleFulfillOrder = () => {
    if (!selectedOrderId) {
      setFulfillMessage("❗ Please select an Order ID.");
      return;
    }
  
    API.post("/fulfill-order", { order_id: selectedOrderId })
      .then((res) => {
        const { usedBatches, skippedBatches } = res.data;
  
        const usedMsg = usedBatches
          .map((b) => `Batch ${b.batch_no} - ${b.used_quantity} units`)
          .join(", ");
  
        const skippedMsg = skippedBatches?.length
          ? `⚠️ Skipped: ${skippedBatches.map((b) => `${b.batch_no} (${b.reason})`).join(", ")}`
          : "";
  
        setFulfillMessage(`✅ Order fulfilled using: ${usedMsg}${skippedMsg ? `\n${skippedMsg}` : ""}`);
        setUsedBatches(usedBatches);
        setShowSelectedTable(true);
        fetchInventory();
        fetchPendingOrders();
        setSelectedOrderId("");
      })
      .catch((err) => {
        const status = err.response?.status;
        const data = err.response?.data;
  
        if (status === 409 && data?.required && data?.available !== undefined) {
          const skipped = data?.skippedBatches || [];
          const skippedMsg = skipped.length
            ? `⚠️ Skipped: ${skipped.map((b) => `${b.batch_no} (${b.reason})`).join(", ")}`
            : "";
  
          setFulfillMessage(
            `❌ Cannot fulfill. Required: ${data.required} units. Available: ${data.available} units.${skippedMsg ? `\n${skippedMsg}` : ""}`
          );
          setUsedBatches(data?.usedBatches || []);
        } else {
          setFulfillMessage("❌ Failed to fulfill the order.");
        }
  
        console.error("❌ Fulfill Order Error:", err);
      });
  };
  
  const handleAdd = async () => {
    const { batch_no, quantity, expiry_date, status, product_id, warehouse_id } = newItem;
    if (!batch_no || !quantity || !expiry_date || !status || !product_id || !warehouse_id) {
      setMessage("❗ Please fill in all fields.");
      return;
    }
    if (Number(quantity) <= 0) {
      setMessage("❗ Quantity must be greater than zero.");
      return;
    }
    try {
      const res = await API.get("/inventory");
      const duplicate = res.data.find(
        (item) => item.batch_no === batch_no && item.warehouse_id === warehouse_id
      );
      if (duplicate) {
        setMessage("❗ This batch number already exists in the selected warehouse.");
        return;
      }
      await API.post("/inventory", newItem);
      fetchInventory();
      setNewItem({
        batch_no: "",
        quantity: "",
        expiry_date: "",
        status: "",
        product_id: "",
        warehouse_id: "",
      });
      setMessage("✅ Item added successfully!");
    } catch (err) {
      console.error("❌ Error adding item:", err);
      const serverMsg = err.response?.data?.error;
      setMessage(serverMsg || "❌ Failed to add item.");
    }
  };
  
  const handleDelete = (id) => {
    API.delete(`/inventory/${id}`)
      .then(() => {
        setInventory((prev) => prev.filter((item) => item.inventory_id !== id));
        setAlerts((prev) => prev.filter((item) => item.inventory_id !== id));
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
  
  const filteredInventory = inventory.filter((item) => {
    const batch = item.batch_no?.toLowerCase() || "";
    const warehouse = item.warehouse_name?.toLowerCase() || ""; // ✅ added
    const search = searchTerm.toLowerCase();
  
    const matchesSearch = batch.includes(search) || warehouse.includes(search); // ✅ updated
    const matchesStatus = selectedStatus === "All" || item.status === selectedStatus;
  
    return matchesSearch && matchesStatus;
  });
  
  
  
 

  return (
    <Container className="py-5" style={{ backgroundColor: '#f4f6f9', minHeight: '100vh' }}>
      <div className="p-4 bg-white shadow rounded">
        <h2 className="mb-4 text-center text-primary">📦 Inventory Management</h2>
        
  
        {message && (
          <Alert variant="info" dismissible onClose={() => setMessage("")}>{message}</Alert>
        )}
  
        {/* ✅ Fulfill Order Section */}
        <div className="bg-light p-4 shadow-sm rounded mb-5">
          <h5 className="mb-3"><FaBoxOpen className="me-2" /> Fulfill Order (First-In-First_Out)</h5>
  
          <Form.Group className="d-flex gap-2 align-items-center mb-3">
            <Form.Select
              value={selectedOrderId}
              onChange={(e) => setSelectedOrderId(e.target.value)}
              style={{ maxWidth: '300px' }}
            >
              <option value="">-- Select Pending Order --</option>
              {pendingOrders.map((order) => (
                <option key={order.order_id} value={order.order_id}>
                  #{order.order_id} - {order.customer_name}
                </option>
              ))}
            </Form.Select>
  
            <Button variant="primary" onClick={handleFulfillOrder}>
              📤 Fulfill Order
            </Button>
          </Form.Group>
  
          {fulfillMessage && <Alert variant="info">{fulfillMessage}</Alert>}
  
          {showSelectedTable && usedBatches.length > 0 && (
            <div className="mt-3 border p-3 bg-white rounded">
              <h6>🧪 Fulfilled Batches</h6>
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
                      <td>{b.used_quantity}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          )}
        </div>
  
        {/* 🔍 Search & Filter */}
        <Form className="mb-4 d-flex flex-wrap gap-3">
          <Form.Control
            type="text"
            placeholder="🔍 Search by Batch No..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-grow-1"
          />
          <Form.Select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            style={{ maxWidth: "200px" }}
          >
            {statuses.map((status, idx) => (
              <option key={idx} value={status}>{status}</option>
            ))}
          </Form.Select>
        </Form>
  
        {/* ➕ Add New Item */}
        <div className="bg-white p-4 rounded shadow-sm mb-5">
          <h5 className="mb-3">➕ Add New Item</h5>
          <Form className="row g-3">
            <div className="col-md-3">
              <Form.Control
                type="text"
                placeholder="Batch No"
                value={newItem.batch_no}
                onChange={(e) => setNewItem({ ...newItem, batch_no: e.target.value })}
              />
            </div>
            <div className="col-md-2">
              <Form.Control
                type="number"
                placeholder="Quantity"
                value={newItem.quantity}
                onChange={(e) => setNewItem({ ...newItem, quantity: e.target.value })}
              />
            </div>
            <div className="col-md-3">
              <Form.Control
                type="date"
                value={newItem.expiry_date}
                onChange={(e) => setNewItem({ ...newItem, expiry_date: e.target.value })}
              />
            </div>
            <div className="col-md-3">
              <Form.Select
                value={newItem.status}
                onChange={(e) => setNewItem({ ...newItem, status: e.target.value })}
              >
                <option value="">Select Status</option>
                {statuses.filter((s) => s !== "All").map((status, idx) => (
                  <option key={idx} value={status}>{status}</option>
                ))}
              </Form.Select>
            </div>
            <div className="col-md-3">
              <Form.Select
                value={newItem.product_id}
                onChange={(e) => setNewItem({ ...newItem, product_id: e.target.value })}
              >
                <option value="">-- Select Product --</option>
                {products.map((p) => (
                  <option key={p.product_id} value={p.product_id}>
                    {p.product_name}
                  </option>
                ))}
              </Form.Select>
            </div>
            <div className="col-md-3">
              <Form.Select
                value={newItem.warehouse_id}
                onChange={(e) => setNewItem({ ...newItem, warehouse_id: e.target.value })}
              >
                <option value="">-- Select Warehouse --</option>
                {warehouses.map((w) => (
                  <option key={w.warehouse_id} value={w.warehouse_id}>
                    {w.name}
                  </option>
                ))}
              </Form.Select>
            </div>
            <div className="col-md-1">
              <Button variant="success" onClick={handleAdd}>
                <FaPlus />
              </Button>
            </div>
          </Form>
        </div>
  
  
        {/* ⚠️ Alerts */}
        {showAlerts && (
  <div className="mb-5">
    <h5 className="d-flex justify-content-between align-items-center text-danger">
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
      <Table striped bordered hover responsive className="mt-3">
        <thead className="table-danger">
          <tr>
            <th>S.No</th> {/* ✅ New S.No column */}
            <th>Batch No</th>
            <th>Quantity</th>
            <th>Product</th>
            <th>Warehouse</th>
            <th>Status</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {alerts.map((item, index) => (
            <tr key={item.inventory_id}>
              <td>{index + 1}</td>

              <td>{item.batch_no}</td>
              <td>{item.quantity}</td>
              <td>{item.product_name || "-"}</td>
              <td>{item.warehouse_name || "-"}</td>
              <td>
                <span
                  className={`badge px-2 py-1 ${
                    item.status === "Expired"
                      ? "bg-danger"
                      : item.status === "Available"
                      ? "bg-success"
                      : item.status === "Reserved"
                      ? "bg-warning text-dark"
                      : item.status === "Out of Stock"
                      ? "bg-secondary"
                      : "bg-light text-dark"
                  }`}
                >
                  {item.status}
                </span>
              </td>
              <td>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => handleDelete(item.inventory_id)}
                  title="Delete Inventory"
                >
                  <FaTrash /> Delete
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    ) : (
      <p>No alerts found.</p>
    )}
  </div>
)}

  
       {/* 📋 Inventory Table */}
<div className="bg-white p-4 rounded shadow-sm">
  <Table striped bordered hover responsive>
    <thead className="table-dark">
      <tr>
        <th>S.No</th>
        <th>Batch No</th>
        <th>Product</th>
        <th>Quantity</th>
        <th>Status</th>
        <th>Expiry Date</th>
        <th>Warehouse</th>
        <th>Actions</th>
      </tr>
    </thead>
    <tbody>
  {filteredInventory.length > 0 ? (
    filteredInventory.map((record, i) => (
      // 🛠 unique row!
<tr key={`${record.batch_no}-${record.warehouse_name}-${i}`}>

        <td>{i + 1}</td>
        <td>{record.batch_no}</td>
        <td>{record.product_name}</td>
        <td>{record.quantity}</td>
        <td>
          <span className={`badge px-2 py-1 ${
            record.status === "Expired"
              ? "bg-danger"
              : record.status === "Available"
              ? "bg-success"
              : record.status === "Reserved"
              ? "bg-warning text-dark"
              : record.status === "Out of Stock"
              ? "bg-secondary"
              : "bg-light text-dark"
          }`}>
            {record.status}
          </span>
        </td>
        <td>{record.expiry_date ? new Date(record.expiry_date).toLocaleDateString() : "-"}</td>
        <td><strong>{record.warehouse_name}</strong></td> {/* ✅ emphasize */}
        <td>
          <Button
            variant="danger"
            size="sm"
            onClick={() => handleDelete(record.inventory_id)}
          >
            <FaTrash /> Delete
          </Button>
        </td>
      </tr>
    ))
  ) : (
    <tr>
      <td colSpan="8" className="text-center">No inventory found.</td>
    </tr>
  )}
</tbody>
  </Table>
</div>

{/* 🔽 Actions */}
<div className="mt-4 d-flex flex-wrap gap-3">
  <Button variant="warning" onClick={fetchAlerts}>
    <FaExclamationTriangle className="me-2" />Check Alerts
  </Button>
  <Button variant="info" onClick={sendAlertsToManager} disabled={sending}>
    {sending ? <Spinner animation="border" size="sm" /> : <FaEnvelope className="me-2" />}Send Alert Email
  </Button>
  <Button variant="success" onClick={handleDownload} disabled={downloading}>
    {downloading ? <Spinner animation="border" size="sm" /> : <FaDownload className="me-2" />}Download Report
  </Button>
</div>
</div>
</Container>
);
}
export default Inventory;