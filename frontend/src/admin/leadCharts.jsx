import React from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

function LeadChart({ data }) {
  // Safety check: Don't render if data is missing or not an array
  if (!data || data.length === 0) {
    return (
      <div className="admin-glass-card p-5 text-center mb-4">
        <p className="text-muted">No analytics data available to display.</p>
      </div>
    );
  }

  return (
    <div className="admin-glass-card p-3 mb-4">
      <h5 className="fw-bold mb-3 text-white">📈 Leads by Status</h5>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
          <XAxis dataKey="status" stroke="#fff" />
          <YAxis stroke="#fff" />
          <Tooltip 
            contentStyle={{ backgroundColor: "#003366", border: "1px solid #ffd700", color: "#fff" }}
            itemStyle={{ color: "#ffd700" }}
          />
          <Line 
            type="monotone" 
            dataKey="count" 
            stroke="#ffd700" 
            strokeWidth={3} 
            dot={{ fill: '#ffd700', r: 6 }}
            activeDot={{ r: 8 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default LeadChart;