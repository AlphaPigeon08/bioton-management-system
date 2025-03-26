import { useEffect, useState } from "react";
import API from "../api";
import "../styles/Table.css";

const Exceptions = () => {
  const [exceptions, setExceptions] = useState([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    API.get("/exceptions")
      .then((response) => setExceptions(response.data))
      .catch((error) => console.error("Error fetching exceptions:", error));
  }, []);

  return (
    <div className="container">
        <div className="container" style={{ paddingTop: "65px" }}></div>
      <h2>⚠️ Exceptions</h2>

      {/* 🔍 Search Bar */}
      <input
        type="text"
        placeholder="🔍 Search by Exception Type..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="search-input"
      />

      {/* 📊 Table */}
      <table className="styled-table">
        <thead>
          <tr>
            <th>Exception Type</th>
            <th>Resolution Status</th>
            <th>Shipment Status</th>
            <th>Exception Date</th>
          </tr>
        </thead>
        <tbody>
          {exceptions
            .filter((exception) =>
              exception.exception_type.toLowerCase().includes(search.toLowerCase())
            )
            .map((exception) => (
              <tr key={exception.exception_id}>
                <td>{exception.exception_type}</td>
                <td>{exception.resolution_status}</td>
                <td>{exception.shipment_status}</td>
                <td>{new Date(exception.exception_date).toLocaleDateString()}</td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
};

export default Exceptions;
