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
    <div className="container-fluid" style={{ paddingTop: "75px", maxWidth: "1200px" }}>
      <div className="card shadow-sm border-0 p-4 rounded">
      <h3 className="text-center text-primary mb-4">⚠️ Exception Logs</h3>

        {/* 🔍 Search */}
        <div className="mb-3">
          <input
            type="text"
            placeholder="🔍 Search by Exception Type..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="form-control shadow-sm"
          />
        </div>

        {/* 📊 Table */}
        <div className="table-responsive">
          <table className="table table-bordered table-striped table-hover align-middle">
            <thead className="table-primary">
              <tr>
                <th>Exception Type</th>
                <th>Message</th>
                <th>Batches Skipped</th>
                <th>Logged By</th>
                <th>Exception Date</th>
              </tr>
            </thead>
            <tbody>
              {exceptions
                .filter((exception) =>
                  exception.exception_type.toLowerCase().includes(search.toLowerCase())
                )
                .map((exception) => {
                  let details = [];
                  try {
                    details = JSON.parse(exception.details || "[]");
                  } catch (err) {
                    console.error("Invalid JSON in details:", err);
                  }

                  return (
                    <tr key={exception.exception_id}>
                      <td>{exception.exception_type}</td>
                      <td>{exception.message}</td>
                      <td>
                        {details.length > 0 ? (
                          <ul className="mb-0 ps-3">
                            {details.map((b, i) => (
                              <li key={i}>
                                Batch <strong>{b.batch_no}</strong> – {b.reason}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <span className="text-muted">None</span>
                        )}
                      </td>
                      <td>{exception.triggered_by_name || "Unknown"}</td>
                      <td>{new Date(exception.exception_date).toLocaleString()}</td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Exceptions;
