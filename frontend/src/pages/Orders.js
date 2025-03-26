import React, { useState, useEffect, useCallback } from "react";
import API from "../api";
import "../styles/Table.css";

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [sortConfig, setSortConfig] = useState({ key: "order_id", direction: "asc" });
  const [search, setSearch] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterWarehouse, setFilterWarehouse] = useState("");

  const [formData, setFormData] = useState({
    customer_name: "",
    product_id: "",
    warehouse_id: "",
    category: "",
    manufacturer: "",
    unit_price: "",
    storage_temperature: "",
    status: "Pending",
  });

  const fetchOrders = useCallback(() => {
    API.get("/orders")
      .then((res) => setOrders(res.data))
      .catch((err) => console.error("Error fetching orders:", err));
  }, []);

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

  useEffect(() => {
    fetchOrders();
    fetchProducts();
    fetchWarehouses();
  }, [fetchOrders]);

  const sortOrders = (key) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") direction = "desc";
    setSortConfig({ key, direction });

    const sorted = [...orders].sort((a, b) => {
      const aVal = a[key] || "";
      const bVal = b[key] || "";
      return direction === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    });

    setOrders(sorted);
  };

  const handleCreateOrder = async () => {
    try {
      await API.post("/create-order", {
        customer_name: formData.customer_name,
        product_id: formData.product_id,
        warehouse_id: formData.warehouse_id,
        status: formData.status,
      });

      setSuccessMessage("✅ Order created!");
      setFormData({
        customer_name: "",
        product_id: "",
        warehouse_id: "",
        category: "",
        manufacturer: "",
        unit_price: "",
        storage_temperature: "",
        status: "Pending",
      });
      fetchOrders();
    } catch (err) {
      setSuccessMessage("❌ Failed to create order");
      console.error("Create Order Error:", err);
    }
  };

  const filteredOrders = orders.filter((order) => {
    const matchCustomer = order.customer_name.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus ? order.status === filterStatus : true;
    const matchWarehouse = filterWarehouse ? order.warehouse_name === filterWarehouse : true;
    return matchCustomer && matchStatus && matchWarehouse;
  });

  return (
    <div className="container">
      <div style={{ paddingTop: "65px" }} />
      <h2>📜 Orders</h2>

      {successMessage && (
        <div className="alert alert-info">{successMessage}</div>
      )}

      <input
        type="text"
        placeholder="🔍 Search by Customer Name..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="search-input"
      />

      <div className="d-flex gap-2 mb-3">
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="">All Status</option>
          <option value="Pending">Pending</option>
          <option value="Shipped">Shipped</option>
          <option value="Delivered">Delivered</option>
        </select>

        <select value={filterWarehouse} onChange={(e) => setFilterWarehouse(e.target.value)}>
          <option value="">All Warehouses</option>
          {[...new Set(orders.map((o) => o.warehouse_name))].map((name, i) => (
            <option key={i} value={name}>{name}</option>
          ))}
        </select>

        <button
  className="btn btn-sm btn-outline-secondary"
  onClick={() => {
    setFilterStatus("");
    setFilterWarehouse("");
    setSearch("");
  }}
>
  🔄 Reset Filters
</button>
      </div>

      <table className="styled-table">
        <thead>
          <tr>
            <th onClick={() => sortOrders("order_id")}>Order ID ⬍</th>
            <th onClick={() => sortOrders("customer_name")}>Customer Name ⬍</th>
            <th onClick={() => sortOrders("product_name")}>Product Name ⬍</th>
            <th>Category</th>
            <th>Manufacturer</th>
            <th>Unit Price</th>
            <th>Storage Temp</th>
            <th onClick={() => sortOrders("warehouse_name")}>Warehouse ⬍</th>
            <th onClick={() => sortOrders("status")}>Status ⬍</th>
          </tr>
        </thead>
        <tbody>
          {filteredOrders.map((order) => (
            <tr key={order.order_id}>
              <td>{order.order_id}</td>
              <td>{order.customer_name}</td>
              <td>{order.product_name || "-"}</td>
              <td>{order.category || "-"}</td>
              <td>{order.manufacturer || "-"}</td>
              <td>{order.unit_price || "-"}</td>
              <td>{order.storage_temperature || "-"}</td>
              <td>{order.warehouse_name || "-"}</td>
              <td>{order.status}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* CREATE ORDER FORM */}
      <div className="mt-4 text-center">
        <h5>➕ Create New Order</h5>
        <div className="d-flex justify-content-center flex-wrap gap-2 mt-3">
          <input
            type="text"
            placeholder="Customer Name"
            value={formData.customer_name}
            onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
          />

          <select
            value={formData.product_id}
            onChange={(e) => {
              const selected = products.find(p => p.product_id === parseInt(e.target.value));
              setFormData({
                ...formData,
                product_id: selected?.product_id || "",
                category: selected?.category || "",
                manufacturer: selected?.manufacturer || "",
                unit_price: selected?.unit_price || "",
                storage_temperature: selected?.storage_temperature || ""
              });
            }}
          >
            <option value="">-- Select Product --</option>
            {products.map((p) => (
              <option key={p.product_id} value={p.product_id}>
                {p.product_name}
              </option>
            ))}
          </select>

          <input type="text" value={formData.category} placeholder="Category" readOnly />
          <input type="text" value={formData.manufacturer} placeholder="Manufacturer" readOnly />
          <input type="number" value={formData.unit_price} placeholder="Unit Price" readOnly />
          <input type="text" value={formData.storage_temperature} placeholder="Storage Temp" readOnly />

          <select
            value={formData.warehouse_id}
            onChange={(e) => setFormData({ ...formData, warehouse_id: e.target.value })}
          >
            <option value="">-- Select Warehouse --</option>
            {warehouses.map((w) => (
              <option key={w.warehouse_id} value={w.warehouse_id}>
                {w.name}
              </option>
            ))}
          </select>

          <select
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
          >
            <option value="Pending">Pending</option>
            <option value="Shipped">Shipped</option>
            <option value="Delivered">Delivered</option>
          </select>

          <button className="btn btn-dark" onClick={handleCreateOrder}>
            Create Order
          </button>
        </div>
      </div>
    </div>
  );
};

export default Orders;
