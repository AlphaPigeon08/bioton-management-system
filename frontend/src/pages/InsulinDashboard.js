import React, { useEffect, useState } from "react";
import API from "../api";
import { Table, Spinner, Alert, Form } from "react-bootstrap";
import { saveAs } from "file-saver";
import "../styles/Insulin.css"

const InsulinDashboard = () => {
  const [products, setProducts] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [category, setCategory] = useState("All");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    API.get("/product-insulin")
      .then((res) => {
        setProducts(res.data);
        setFiltered(res.data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    let data = [...products];
    if (category !== "All") {
      data = data.filter((p) => p.category === category);
    }
    if (search) {
      data = data.filter((p) =>
        p.product_name.toLowerCase().includes(search.toLowerCase())
      );
    }
    setFiltered(data);
  }, [category, search, products]);

  const handleExportCSV = () => {
    const headers = "Product,Category,Manufacturer,Price,Storage Temp\n";
    const rows = filtered
      .map(
        (p) =>
          `${p.product_name},${p.category},${p.manufacturer},${p.unit_price},${p.storage_temperature}`
      )
      .join("\n");

    const blob = new Blob([headers + rows], { type: "text/csv" });
    saveAs(blob, "insulin_products.csv");
  };

  const categories = ["All", ...new Set(products.map((p) => p.category))];

  return (
    <div className="container insulin">
      <h2 className="text-center my-4">💉 Insulin Products</h2>

      <div className="d-flex gap-3 mb-3 flex-wrap align-items-center">
        <Form.Select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          style={{ maxWidth: "250px" }}
        >
          {categories.map((cat) => (
            <option key={cat}>{cat}</option>
          ))}
        </Form.Select>

        <Form.Control
          type="text"
          placeholder="Search by name"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ maxWidth: "250px" }}
        />

        <button onClick={handleExportCSV} className="btn btn-success ms-auto">
          📁 Export CSV
        </button>
      </div>

      {loading ? (
        <Spinner animation="border" />
      ) : filtered.length > 0 ? (
        <Table striped bordered hover responsive>
          <thead>
            <tr>
              <th>Product</th>
              <th>Category</th>
              <th>Manufacturer</th>
              <th>Price ($)</th>
              <th>Storage Temp</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((item) => (
              <tr key={item.product_id}>
                <td>{item.product_name}</td>
                <td>{item.category}</td>
                <td>{item.manufacturer}</td>
                <td>{item.unit_price}</td>
                <td>{item.storage_temperature}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      ) : (
        <Alert variant="info">No matching products found.</Alert>
      )}
    </div>
  );
};

export default InsulinDashboard;
