import React, { useEffect, useState } from "react";
import Header from "../components/Header";
import { Form, Button, Table, Alert, Card } from "react-bootstrap";
import API from "../api";

const TransferInventory = () => {
  const [warehouses, setWarehouses] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [selectedItem, setSelectedItem] = useState("");
  const [fromWarehouse, setFromWarehouse] = useState("");
  const [toWarehouse, setToWarehouse] = useState("");
  const [quantity, setQuantity] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [transferList, setTransferList] = useState([]);
  const [activeTab, setActiveTab] = useState("transfer");

  useEffect(() => {
    fetchWarehouses();
    fetchInventory();
    fetchTransfers();
  }, []);

  const fetchWarehouses = () => {
    API.get("/warehouses")
      .then((res) => setWarehouses(res.data))
      .catch((err) => console.error("Error loading warehouses", err));
  };

  const fetchInventory = () => {
    API.get("/inventory")
      .then((res) => setInventory(res.data))
      .catch((err) => console.error("Error loading inventory", err));
  };

  const fetchTransfers = () => {
    API.get("/transfers")
      .then((res) => setTransferList(res.data))
      .catch((err) => console.error("Error loading transfers", err));
  };

  const handleTransfer = async () => {
    if (!selectedItem || !fromWarehouse || !toWarehouse || !quantity) {
      alert("⚠️ Please fill in all fields");
      return;
    }

    try {
      await API.post("/transfer-inventory", {
        inventory_id: selectedItem,
        from_warehouse: fromWarehouse,
        to_warehouse: toWarehouse,
        quantity: parseInt(quantity),
      });

      setSuccessMessage("✅ Stock transfer successful!");
      setSelectedItem("");
      setFromWarehouse("");
      setToWarehouse("");
      setQuantity("");
      fetchInventory();
      fetchTransfers();
    } catch (err) {
      console.error("Transfer failed", err);
      alert("❌ Transfer failed. Try again.");
    }
  };

  return (
    <>
      <Header
        username="User"
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        showHomeOnly={false}
      />

      <div
        className="container"
        style={{
          paddingTop: "100px",
          background: "rgba(255, 255, 255, 0.7)",
          backdropFilter: "blur(4px)",
          borderRadius: "10px",
          padding: "20px",
        }}
      >
        <div className="mt-5 pt-5"></div>
        <Card className="p-4 shadow-sm mb-4">
        <h3 className="text-primary mb-3">🔁 Stock Transfer</h3>

        {successMessage && <Alert variant="success">{successMessage}</Alert>}

        <Form className="row g-3">
          <Form.Group className="col-md-4">
            <Form.Select
              value={fromWarehouse}
              onChange={(e) => setFromWarehouse(e.target.value)}
            >
              <option value="">From Warehouse</option>
              {warehouses.map((w) => (
                <option key={w.warehouse_id} value={w.warehouse_id}>
                  {w.name}
                </option>
              ))}
            </Form.Select>
          </Form.Group>

          <Form.Group className="col-md-4">
            <Form.Select
              value={toWarehouse}
              onChange={(e) => setToWarehouse(e.target.value)}
            >
              <option value="">To Warehouse</option>
              {warehouses.map((w) => (
                <option key={w.warehouse_id} value={w.warehouse_id}>
                  {w.name}
                </option>
              ))}
            </Form.Select>
          </Form.Group>

          <Form.Group className="col-md-4">
            <Form.Select
              value={selectedItem}
              onChange={(e) => setSelectedItem(e.target.value)}
              disabled={!fromWarehouse} // Disable if no warehouse selected
            >
              <option value="">Select Inventory Batch</option>
              {inventory
                .filter((inv) => inv.warehouse_id === parseInt(fromWarehouse))
                .map((inv) => (
                  <option key={inv.inventory_id} value={inv.inventory_id}>
                    {inv.batch_no} | Qty: {inv.quantity} | {inv.status}
                  </option>
              ))}
            </Form.Select>
          </Form.Group>

          <Form.Group className="col-md-3">
            <Form.Control
              type="number"
              placeholder="Quantity"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
          </Form.Group>

          <Form.Group className="col-md-3">
            <Button className="w-100" variant="primary" onClick={handleTransfer}>
              ➡ Confirm Transfer
            </Button>
          </Form.Group>
        </Form>
      </Card>

      <Card className="p-4 shadow-sm">
        <h4 className="mb-3">📦 Transfer History</h4>
        <Table striped bordered hover responsive className="mb-0">
          <thead className="table-dark">
            <tr>
              <th>Transfer ID</th>
              <th>Batch No</th>
              <th>From</th>
              <th>To</th>
              <th>Quantity</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {transferList.length === 0 ? (
              <tr>
                <td colSpan="6" className="text-center">
                  No transfers found
                </td>
              </tr>
            ) : (
              transferList.map((t) => (
                <tr key={t.transfer_id}>
                  <td>{t.transfer_id}</td>
                  <td>{t.batch_no}</td>
                  <td>{t.from_warehouse_name}</td>
                  <td>{t.to_warehouse_name}</td>
                  <td>{t.quantity}</td>
                  <td>{new Date(t.transfer_date).toLocaleString()}</td>
                </tr>
              ))
            )}
          </tbody>
        </Table>
        </Card>
      </div>
    </>
  );
};

export default TransferInventory;
