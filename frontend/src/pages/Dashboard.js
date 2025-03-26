import React, { useState, useEffect } from "react";
import Inventory from "./Inventory";
import Orders from "./Orders";
import Exceptions from "./Exceptions";
import InsulinDashboard from "./InsulinDashboard";
import Header from "../components/Header";
import { Bar, Pie, Doughnut } from "react-chartjs-2";
import API from "../api";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import insulinBg from "../assets/insulin-bg.jpg";

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [filters, setFilters] = useState({
    orderStatus: "All",
    inventoryStatus: "All",
    exceptionType: "All",
    insulinCategory: "All",
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [ordersRes, inventoryRes, exceptionsRes, insulinRes] = await Promise.all([
          API.get("/orders"),
          API.get("/inventory"),
          API.get("/exceptions"),
          API.get("/product-insulin"),
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

  const renderChart = (label, data, ChartComponent, colors) => {
    if (!data || Object.keys(data).length === 0) {
      return <p>⚠️ No {label.toLowerCase()} data available.</p>;
    }

    return (
      <div style={{ maxWidth: "300px", margin: "10px auto" }}>
        <h6>{label}</h6>
        <ChartComponent
          options={{
            responsive: true,
            plugins: {
              legend: { position: "bottom" },
              tooltip: { enabled: true },
            },
          }}
          data={{
            labels: Object.keys(data),
            datasets: [
              {
                label,
                data: Object.values(data),
                backgroundColor: colors,
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

  return (
    <div>
      <Header activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* 🔷 Blurred Insulin Background */}
      <div
        style={{
          backgroundImage: `url(${insulinBg})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          filter: "blur(10px)",
          position: "fixed",
          width: "100%",
          height: "100%",
          top: 0,
          left: 0,
          zIndex: -2,
        }}
      ></div>

      {/* 🔷 White Overlay */}
      <div
        style={{
          backgroundColor: "rgba(255, 255, 255, 0.6)",
          backdropFilter: "blur(2px)",
          position: "fixed",
          width: "100%",
          height: "100%",
          top: 0,
          left: 0,
          zIndex: -1,
        }}
      ></div>

      {/* 🔷 Main Content */}
      <div style={{ padding: "20px" }}>
        {loading && <p>⏳ Loading dashboard...</p>}
        {error && <p style={{ color: "red" }}>{error}</p>}

        {!loading && !error && activeTab === "welcome" && (
          <div>
            <div className="container" style={{ paddingTop: "65px" }}></div>
            <h3 className="text-center mb-4">Welcome to Bioton Management System! 🎉</h3>
            <p className="text-center">Quick overview of your operations:</p>

            {/* Filters */}
            <div className="row mb-4">
              {[
                { label: "Order Status", value: filters.orderStatus, key: "orderStatus", source: orderStats },
                { label: "Inventory Status", value: filters.inventoryStatus, key: "inventoryStatus", source: inventoryStats },
                { label: "Exception Type", value: filters.exceptionType, key: "exceptionType", source: exceptionStats },
                { label: "Insulin Category", value: filters.insulinCategory, key: "insulinCategory", source: insulinStats },
              ].map((filter, index) => (
                <div className="col-md-3" key={index}>
                  <label>{filter.label}</label>
                  <select
                    className="form-control"
                    value={filter.value}
                    onChange={(e) => setFilters({ ...filters, [filter.key]: e.target.value })}
                  >
                    <option>All</option>
                    {filter.source && Object.keys(filter.source).map((opt) => <option key={opt}>{opt}</option>)}
                  </select>
                </div>
              ))}
            </div>

            {/* Summary Cards & Charts */}
            <div id="dashboard-summary">
              <div className="row text-center mb-4">
                {[
                  { label: "Total Orders", color: "primary", stat: orderStats },
                  { label: "Total Inventory Items", color: "secondary", stat: inventoryStats },
                  { label: "Exceptions", color: "danger", stat: exceptionStats },
                  { label: "Insulin Products", color: "success", stat: insulinStats },
                ].map((card, index) => (
                  <div className="col-md-3" key={index}>
                    <div className={`card text-white bg-${card.color}`}>
                      <div className="card-body">
                        <h5>{card.label}</h5>
                        <p className="display-6">{Object.values(card.stat || {}).reduce((a, b) => a + b, 0)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="row">
                <div className="col-md-6">{renderChart("Orders by Status", applyFilter(orderStats, filters.orderStatus), Bar, ["#007bff", "#28a745", "#dc3545", "#ffc107"])}</div>
                <div className="col-md-6">{renderChart("Inventory by Status", applyFilter(inventoryStats, filters.inventoryStatus), Pie, ["#17a2b8", "#ffc107", "#dc3545", "#6c757d"])}</div>
                <div className="col-md-6">{renderChart("Exceptions", applyFilter(exceptionStats, filters.exceptionType), Doughnut, ["#e83e8c", "#20c997", "#007bff", "#fd7e14"])}</div>
                <div className="col-md-6">{renderChart("Insulin Products by Category", applyFilter(insulinStats, filters.insulinCategory), Doughnut, ["#007bff", "#28a745", "#ffc107", "#dc3545", "#6c757d"])}</div>
              </div>
            </div>

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
        {!loading && activeTab === "insulin" && <InsulinDashboard />}
      </div>
    </div>
  );
};

export default Dashboard;
