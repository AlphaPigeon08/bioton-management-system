import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import Inventory from "./Inventory";
import Orders from "./Orders";
import Exceptions from "./Exceptions";
import InsulinDashboard from "./InsulinDashboard";
import Header from "../components/Header";
import { Bar, Pie, Doughnut } from "react-chartjs-2";
import API from "../api";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import {
  Chart as ChartJS,
  BarElement,
  CategoryScale,
  LinearScale,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(
  BarElement,
  CategoryScale,
  LinearScale,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState("welcome");
  const [orderStats, setOrderStats] = useState(null);
  const [inventoryStats, setInventoryStats] = useState(null);
  const [exceptionStats, setExceptionStats] = useState(null);
  const [insulinStats, setInsulinStats] = useState(null);
  const [transferStats, setTransferStats] = useState(null);
  const [transferRoute, setTransferRoute] = useState("All");
  const [loading, setLoading] = useState(true);
  const transferEntries = Object.entries(transferStats || {});
const totalTransferred = transferEntries.reduce((sum, [, qty]) => sum + qty, 0);
  const [error, setError] = useState("");

  const [filters, setFilters] = useState({
    orderStatus: "All",
    inventoryStatus: "All",
    exceptionType: "All",
    insulinCategory: "All",
    warehouseName: "All",
  });
  const [inventoryByWarehouse, setInventoryByWarehouse] = useState({});
  const location = useLocation();

  useEffect(() => {
    if (location.state?.tab) {
      setActiveTab(location.state.tab);
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);
  useEffect(() => {
    console.log("🔥 Transfer Stats:", transferStats);
  }, [transferStats]);
  

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [ordersRes, inventoryRes, exceptionsRes, insulinRes, transfersRes] = await Promise.all([
          API.get("/orders"),
          API.get("/inventory"),
          API.get("/exceptions"),
          API.get("/product-insulin"),
          API.get("/transfers"),
        ]);

        const orders = ordersRes.data.reduce((acc, order) => {
          acc[order.status] = (acc[order.status] || 0) + 1;
          return acc;
        }, {});
        setOrderStats(orders);

        const inventory = inventoryRes.data.reduce((acc, item) => {
          acc[item.status] = (acc[item.status] || 0) + 1;
          return acc;
        }, {});
        setInventoryStats(inventory);
        const inventoryWarehouse = inventoryRes.data.reduce((acc, item) => {
          const warehouse = item.warehouse_name;
          const qty = Number(item.quantity);
          acc[warehouse] = (acc[warehouse] || 0) + qty;
          return acc;
        }, {});
        setInventoryByWarehouse(inventoryWarehouse);
  

        const exceptions = exceptionsRes.data.reduce((acc, ex) => {
          acc[ex.exception_type] = (acc[ex.exception_type] || 0) + 1;
          return acc;
        }, {});
        setExceptionStats(exceptions);

        const insulin = insulinRes.data.reduce((acc, i) => {
          acc[i.category] = (acc[i.category] || 0) + 1;
          return acc;
        }, {});
        setInsulinStats(insulin);

        const transfers = transfersRes.data.reduce((acc, t) => {
          const route = `${t.from_warehouse_name} → ${t.to_warehouse_name}`;
          acc[route] = (acc[route] || 0) + t.quantity;
          return acc;
        }, {});
        setTransferStats(transfers);
      } catch (err) {
        console.error("❌ Failed to fetch dashboard data:", err);
        setError("❌ Failed to load dashboard data. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const applyFilter = (data, key) => {
    if (!data || key === "All") return data;
    return { [key]: data[key] };
  };

  const filteredWarehouseData = Object.entries(inventoryByWarehouse || {})
  .filter(([_, qty]) => qty > 0)
  .reduce((acc, [name, qty]) => {
    acc[name] = qty;
    return acc;
  }, {}); 

  const renderChart = (label, data, ChartComponent, colors, options = {}) => {
    if (!data || Object.keys(data).length === 0) {
      return <p>⚠️ No {label.toLowerCase()} data available.</p>;
    }

    const isStockTransfers = label === "Stock Transfers";
    const isOrders = label === "Orders by Status";
    const isWarehouse = label === "Warehouse Stock";
  
    // Conditional style
    const chartStyle = {
      maxWidth: isStockTransfers || isOrders || isWarehouse? "700px" : "400px",
      margin: "10px auto",
      paddingTop : "20px",
      textAlign: "center",
    };
  
    // Conditional x-axis tick display
    const chartOptions = {
      responsive: true,
      plugins: {
        legend: { position: "top" },
        tooltip: { enabled: true },
      },
      ...options,
      scales: {
        ...(options.scales || {}),
        x: {
          ...(options.scales?.x || {}),
          ticks: {
            ...(options.scales?.x?.ticks || {}),
            display: !isStockTransfers && !isWarehouse, // hide x-axis labels only for Stock Transfers
          },
        },
      },
    };
  
  
    const colorMaps = {
      "Orders by Status": {
      "Pending": "#007bff",       // Blue
      "Processing": "#17a2b8",    // Teal
      "Shipped": "#ffc107",       // Yellow
      "Delivered": "#28a745",     // Green
      "Cancelled": "#dc3545",     // Red
      "Returned": "#6f42c1",      // Purple
      "Failed": "#343a40",        // Dark gray
      "Completed": "#20c997",      // Aqua
},

      "Inventory by Status": {
        "Out of Stock": "#17a2b8",
        "Expired": "#ffc107",
        "Reserved": "#dc3545",
        "Available": "#6c757d"
      },
     "Exceptions": {
  "Missing Items": "#dc3545",         // Red
  "Expired Stock Issue": "#ffc107",   // Yellow
  "Late Processing": "#007bff",       // Blue
  "Order Mismatch": "#6f42c1",        // Purple
  "FIFO Violation": "#20c997",        // Teal
  "FIFO": "#fd7e14"                   // Orange
},
"Insulin Products by Category": {
  "Rapid-Acting": "#007bff",
  "Short-Acting": "#28a745",
  "Intermediate-Acting": "#ffc107",
  "Long-Acting": "#dc3545",
  "Combination": "#6c757d"
},
      "Stock Transfers": {
        // optional: default all routes to purple or generate random
        default: "#28a745"
      },
      "Warehouse Stock": {
        default: "#20c997" // Teal
      }
    };
  
    // pick color map based on chart label
    const chartColors = Object.keys(data).map((labelKey) => {
      const map = colorMaps[label];
      if (map && map[labelKey]) return map[labelKey];
      if (map && map.default) return map.default;
      return "#999"; // fallback
    });
  
    return (
      <div style={chartStyle}>
    <h6>{label}</h6>
    <ChartComponent
      options={chartOptions}
      data={{
        labels: Object.keys(data),
        datasets: [
          {
            label,
            data: Object.values(data),
            backgroundColor: chartColors,
            borderWidth: 1,
          },
        ],
      }}
    />
  </div>
    );
  };
  
  const handleExport = () => {
    const input = document.getElementById("dashboard-summary");

    html2canvas(input, {
      scale: 2,
      scrollY: -window.scrollY,
      useCORS: true,
    }).then((canvas) => {
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "pt", "a4");

      const pageWidth = pdf.internal.pageSize.getWidth();
      const imgHeight = (canvas.height * pageWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, "PNG", 0, position, pageWidth, imgHeight);
      heightLeft -= pdf.internal.pageSize.getHeight();

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, pageWidth, imgHeight);
        heightLeft -= pdf.internal.pageSize.getHeight();
      }

      pdf.save("dashboard-summary.pdf");
    });
  };

  const filteredTransfers = applyFilter(transferStats, transferRoute);
  //const transferEntries = Object.entries(transferStats || {});
//const totalTransferred = transferEntries.reduce((sum, [, qty]) => sum + qty, 0);
return (
  <div>
    <Header activeTab={activeTab} setActiveTab={setActiveTab} />

    <div style={{ backgroundColor: "#f9f9f9", minHeight: "100vh", paddingTop: "70px" }}>
      <div style={{ padding: "20px" }}>
        {loading && <p>⏳ Loading dashboard...</p>}
        {error && <p style={{ color: "red" }}>{error}</p>}

        {!loading && !error && activeTab === "welcome" && (
          <div>
            <h3 className="text-center mb-4">Welcome to Bioton Management System! 🎉</h3>
            <p className="text-center">Quick overview of your operations:</p>

            {/* Wrap entire section in one exportable div */}
            <div id="dashboard-summary">
              {/* ✅ Summary Cards */}
              <div className="row text-center mb-4">
                <div className="col-md-2">
                  <div className="card text-white bg-primary mb-3">
                    <div className="card-body">
                      <h5>Total Orders</h5>
                      <p className="display-6">{Object.values(orderStats || {}).reduce((a, b) => a + b, 0)}</p>
                    </div>
                  </div>
                  <div className="card text-white bg-dark">
                    <div className="card-body">
                      <h5>Total Inventory Units</h5>
                      <p className="display-6">
                        {Object.values(inventoryByWarehouse || {}).reduce((a, b) => a + b, 0)}
                      </p>
                    </div>
                  </div>
                </div>

                {[
                  { label: "Total Inventory Items", data: inventoryStats, color: "secondary" },
                  { label: "Exceptions", data: exceptionStats, color: "danger" },
                  { label: "Insulin Products", data: insulinStats, color: "success" },
                ].map(({ label, data, color }) => {
                  const total = data ? Object.values(data).reduce((a, b) => a + b, 0) : 0;
                  return (
                    <div className="col-md-2" key={label}>
                      <div className={`card text-white bg-${color}`}>
                        <div className="card-body">
                          <h5>{label}</h5>
                          <p className="display-6">{total}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}

                <div className="col-md-2">
                  <div className="card text-white bg-success">
                    <div className="card-body">
                      <h5>Total Transferred</h5>
                      <p className="display-6">{totalTransferred}</p>
                    </div>
                  </div>
                </div>

                <div className="col-md-2">
                  <div className="card text-white bg-info">
                    <div className="card-body">
                      <h5>Transfer Entries</h5>
                      <p className="display-6">{transferEntries.length}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* ✅ Charts */}
              <div className="row">
                <div className="col-md-6">
                  <label>Order Status</label>
                  <select
                    className="form-control mb-2"
                    value={filters.orderStatus}
                    onChange={(e) => setFilters({ ...filters, orderStatus: e.target.value })}
                  >
                    <option>All</option>
                    {orderStats && Object.keys(orderStats).map((opt) => <option key={opt}>{opt}</option>)}
                  </select>
                  {renderChart("Orders by Status", applyFilter(orderStats, filters.orderStatus), Bar)}
                </div>

                <div className="col-md-6">
                  <label>Inventory Status</label>
                  <select
                    className="form-control mb-2"
                    value={filters.inventoryStatus}
                    onChange={(e) => setFilters({ ...filters, inventoryStatus: e.target.value })}
                  >
                    <option>All</option>
                    {inventoryStats && Object.keys(inventoryStats).map((opt) => <option key={opt}>{opt}</option>)}
                  </select>
                  {renderChart("Inventory by Status", applyFilter(inventoryStats, filters.inventoryStatus), Pie)}
                </div>

                <div className="col-md-6">
                  <label>Exception Type</label>
                  <select
                    className="form-control mb-2"
                    value={filters.exceptionType}
                    onChange={(e) => setFilters({ ...filters, exceptionType: e.target.value })}
                  >
                    <option>All</option>
                    {exceptionStats && Object.keys(exceptionStats).map((opt) => <option key={opt}>{opt}</option>)}
                  </select>
                  {renderChart("Exceptions", applyFilter(exceptionStats, filters.exceptionType), Doughnut)}
                </div>

                <div className="col-md-6">
                  <label>Insulin Category</label>
                  <select
                    className="form-control mb-2"
                    value={filters.insulinCategory}
                    onChange={(e) => setFilters({ ...filters, insulinCategory: e.target.value })}
                  >
                    <option>All</option>
                    {insulinStats && Object.keys(insulinStats).map((opt) => <option key={opt}>{opt}</option>)}
                  </select>
                  {renderChart("Insulin Products by Category", applyFilter(insulinStats, filters.insulinCategory), Doughnut)}
                </div>

                {/* Transfers + Warehouse Bar Chart */}
                <div className="row">
                  <div className="col-md-6">
                    <label>Stock Transfer Route</label>
                    <select
                      className="form-control mb-2"
                      value={transferRoute}
                      onChange={(e) => setTransferRoute(e.target.value)}
                    >
                      <option>All</option>
                      {transferStats && Object.keys(transferStats).map((r) => (
                        <option key={r}>{r}</option>
                      ))}
                    </select>
                    <div style={{ margin: "0 auto" }}>
                      {renderChart("Stock Transfers", filteredTransfers, Bar, ["#6f42c1"], {
                        indexAxis: "x",
                        scales: {
                          x: {
                            ticks: { autoSkip: false, maxRotation: 0, minRotation: 0 },
                          },
                        },
                      })}
                    </div>
                  </div>

                  <div className="col-md-6">
                    <label>Warehouse</label>
                    <select
                      className="form-control mb-2"
                      value={filters.warehouseName}
                      onChange={(e) => setFilters({ ...filters, warehouseName: e.target.value })}
                    >
                      <option>All</option>
                      {Object.keys(filteredWarehouseData).map((wh) => (
                        <option key={wh}>{wh}</option>
                      ))}
                    </select>

                    {renderChart(
                      "Warehouse Stock",
                      applyFilter(filteredWarehouseData, filters.warehouseName),
                      Bar
                    )}
                  </div>
                </div>
              </div>
            </div> {/* ✅ END: dashboard-summary */}

            <div className="text-center mt-4">
              <button className="btn btn-outline-dark" onClick={handleExport}>
                📄 Export Dashboard as PDF
              </button>
            </div>
          </div>
        )}

        {!loading && !error && activeTab === "inventory" && <Inventory />}
        {!loading && !error && activeTab === "orders" && <Orders />}
        {!loading && !error && activeTab === "exceptions" && <Exceptions />}
        {!loading && !error && activeTab === "insulin" && <InsulinDashboard />}
      </div>
    </div>
  </div>
);
};

export default Dashboard;