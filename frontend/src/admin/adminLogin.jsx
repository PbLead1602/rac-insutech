import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import logo from "../images/RAC LOGOO.jpg"; // Using your brand logo
import "../styles/admin.css";
import API from "../services/api";

function AdminLogin() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ username: "", password: "" });
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await API.post("/api/admin/login", formData);
      localStorage.setItem("adminToken", res.data.token);
      navigate("/admin/dashboard");
    } catch (err) {
      setError("Unauthorized access. Please check credentials.");
    }
  };

  return (
    <div className="admin-login-page">
      <div className="admin-login-card animate__animated animate__fadeIn">
        <img src={logo} alt="RAC Insutech" className="login-logo" />
        <h3>Admin Portal</h3>
        <p>Enter your credentials to manage leads</p>

        {error && (
          <div className="alert alert-danger py-2 small border-0 mb-4" style={{ background: "rgba(220, 53, 69, 0.2)", color: "#ff8080" }}>
            <i className="bi bi-exclamation-triangle-fill me-2"></i>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="admin-input-group">
            <i className="bi bi-person-fill"></i>
            <input
              type="text"
              className="form-control admin-login-input"
              placeholder="Username"
              name="username"
              onChange={handleChange}
              required
            />
          </div>

          <div className="admin-input-group">
            <i className="bi bi-lock-fill"></i>
            <input
              type="password"
              className="form-control admin-login-input"
              placeholder="Password"
              name="password"
              onChange={handleChange}
              required
            />
          </div>

          <button type="submit" className="admin-login-btn">
            Secure Login <i className="bi bi-arrow-right-short ms-1"></i>
          </button>
        </form>

        <div className="mt-4 pt-2 border-top border-secondary">
          <small className="text-secondary">© {new Date().getFullYear()} RAC Insutech Systems</small>
        </div>
      </div>
    </div>
  );
}

export default AdminLogin;