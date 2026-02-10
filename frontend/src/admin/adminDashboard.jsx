import React, { useEffect, useState, useCallback } from "react";
import API from "../services/api";
import LeadTable from "./leadTable";
import LeadChart from "./leadCharts";
import "../styles/admin.css";

function AdminDashboard() {
  const token = localStorage.getItem("adminToken");

  const [leads, setLeads] = useState([]); 
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchLeads = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      
      // 1. Fetch Leads
      const res = await API.get(`api/admin/leads?page=${currentPage}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setLeads(res.data.leads || []);
      setTotalPages(res.data.totalPages || 1);

      // 2. Fetch Stats & Transform for Chart
      try {
        const chartRes = await API.get("api/admin/stats", {
          headers: { Authorization: `Bearer ${token}` }
        });

        // TRANSFORM: Recharts needs an Array, Backend sends an Object
        // Converts { NEW: 5, CLOSED: 2 } to [{ status: "NEW", count: 5 }, { status: "CLOSED", count: 2 }]
        const formattedData = Object.entries(chartRes.data).map(([key, value]) => ({
          status: key,
          count: value
        }));

        setChartData(formattedData);
      } catch (err) {
        console.warn("Stats API failed. Chart will remain empty.");
      }

    } catch (error) {
      console.error("Failed to load admin data", error);
    } finally {
      setLoading(false);
    }
  }, [token, currentPage]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  const handleStatusChange = async (id, status) => {
    try {
      await API.put(`api/admin/lead/${id}`, { status }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchLeads();
    } catch (error) {
      alert("Status update failed");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure? This is permanent!")) return;
    try {
      await API.delete(`api/admin/lead/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchLeads();
    } catch (error) {
      alert("Delete failed");
    }
  };

  const safeLeads = leads || [];

  return (
    <div className="admin-bg-wrapper">
      <div className="container" style={{ marginTop: "120px" }}>
        <div className="admin-glass-card">
          <h2 className="fw-bold mb-4">📊 Lead Management Dashboard</h2>

          {/* Stats Summary Row */}
            <div className="row mb-4">
                {[
                    { label: "Total Leads", key: "TOTAL", icon: "bi-people", color: "text-white" },
                    { label: "New", key: "NEW", icon: "bi-lightning-charge", color: "text-gold" },
                    { label: "Follow-Up", key: "FOLLOW-UP", icon: "bi-clock-history", color: "text-cyan" },
                    { label: "Closed", key: "CLOSED", icon: "bi-check-all", color: "text-emerald" }
                ].map((item) => (
                    <div className="col-md-3 mb-3" key={item.label}>
                    <div className="stat-card-glass">
                        <i className={`bi ${item.icon} stat-icon ${item.color}`}></i>
                        <h6 className="stat-label">{item.label}</h6>
                        <h3 className={`stat-value ${item.color}`}>
                        {item.key === "TOTAL" ? safeLeads.length : safeLeads.filter(l => l.status === item.key).length}
                        </h3>
                    </div>
                    </div>
                ))}
            </div>

          {/* CHART COMPONENT */}
          <LeadChart data={chartData} />

          {loading ? (
            <div className="text-center my-4"><div className="spinner-border text-gold"></div></div>
          ) : (
            <LeadTable leads={safeLeads} onStatusChange={handleStatusChange} onDelete={handleDelete} />
          )}

          <div className="d-flex justify-content-center mt-4">
            <button className="admin-logout-btn py-1 px-3 me-2" disabled={currentPage === 1} onClick={() => setCurrentPage(prev => prev - 1)}>Prev</button>
            <span className="text-white mx-3">Page {currentPage} of {totalPages}</span>
            <button className="admin-logout-btn py-1 px-3" disabled={currentPage === totalPages} onClick={() => setCurrentPage(prev => prev + 1)}>Next</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;