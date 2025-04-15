import React, { useEffect, useState } from "react";
import Header from "../components/Header";
import API from "../api";
import { Table, Button, Form } from "react-bootstrap";
import "../styles/ProductStock.css"

const ProductStock = () => {
  const [stocks, setStocks] = useState([]);
  const user = JSON.parse(localStorage.getItem("user"));
  const [editProductId, setEditProductId] = useState(null);
  const [newStock, setNewStock] = useState("");
  const role = user?.role || "N/A";
  
  const fetchStocks = async () => {
    try {
      const res = await API.get("/product-insulin");
      const stockRes = await API.get("/product-stock");
      const stockMap = Object.fromEntries(stockRes.data.map(p => [p.product_id, p.total_stock]));

      const merged = res.data.map(product => ({
        ...product,
        total_stock: stockMap[product.product_id] || 0
      }));

      setStocks(merged);
    } catch (err) {
      console.error("❌ Failed to fetch stock data", err);
    }
  };

  const handleUpdate = async (product_id) => {
    try {
      await API.post("/product-stock", {
        product_id,
        total_stock: parseInt(newStock)
      });

      setEditProductId(null);
      setNewStock("");
      fetchStocks();
    } catch (err) {
      console.error("❌ Failed to update stock", err);
    }
  };

  useEffect(() => {
    fetchStocks();
  }, []);

  return (
    <div>
      <Header activeTab="" setActiveTab={() => {}} />
      <div className="container pt-4 productStock" >
        <h3 className="mb-4">📦 Manage Product Stock</h3>
        <Table bordered hover responsive>
          <thead className="table-light">
            <tr>
              <th>Product</th>
              <th>Category</th>
              <th>Manufacturer</th>
              <th>Total Stock</th>
              {(role === "Admin" || role ==="Warehouse_Manager") && (<th>Update</th>)}
              
            </tr>
          </thead>
          <tbody>
            {stocks.length === 0 ? (
              <tr>
                <td colSpan="5" className="text-center text-muted">
                  No product stock data available.
                </td>
              </tr>
            ) : (
              stocks.map((product) => (
                <tr key={product.product_id}>
                  <td>{product.product_name}</td>
                  <td>{product.category}</td>
                  <td>{product.manufacturer}</td>
                  <td>
                    {editProductId === product.product_id ? (
                      <Form.Control
                        type="number"
                        value={newStock}
                        onChange={(e) => setNewStock(e.target.value)}
                        min="0"
                      />
                    ) : (
                      product.total_stock
                    )}
                  </td>
                  {(role === "Admin" || role === "Warehouse_Manager") && (
                    <td>
                        {editProductId === product.product_id ? (
                        <Button
                            variant="success"
                            size="sm"
                            onClick={() => handleUpdate(product.product_id)}
                        >
                            Save
                        </Button>
                        ) : (
                        <Button
                            variant="outline-primary"
                            size="sm"
                            onClick={() => {
                            setEditProductId(product.product_id);
                            setNewStock(product.total_stock);
                            }}
                        >
                            Edit
                        </Button>
                        )}
                    </td>
                    )}
                </tr>
              ))
            )}
          </tbody>
        </Table>
      </div>
    </div>
  );
};

export default ProductStock;
