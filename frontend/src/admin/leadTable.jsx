import React, { useState } from "react";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

function LeadTable({ leads, onStatusChange, onDelete }) {

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // SEARCH + FILTER LOGIC
  const filteredLeads = leads.filter((lead) => {

    const matchSearch =
      lead.name.toLowerCase().includes(search.toLowerCase()) ||
      lead.email.toLowerCase().includes(search.toLowerCase());

    const matchStatus =
      statusFilter === "" || lead.status === statusFilter;

    return matchSearch && matchStatus;
  });

  // EXPORT TO EXCEL
  const exportExcel = () => {

    const worksheet = XLSX.utils.json_to_sheet(filteredLeads);
    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(workbook, worksheet, "Leads");

    const excelBuffer = XLSX.write(workbook, {
      bookType: "xlsx",
      type: "array",
    });

    const file = new Blob([excelBuffer], {
      type: "application/octet-stream",
    });

    saveAs(file, "RAC-Leads.xlsx");
  };

  return (
    <>
      {/* SEARCH + FILTER + EXPORT BAR */}
      <div className="row mb-3">

        <div className="col-md-4">
          <input
            type="text"
            className="form-control"
            placeholder="Search name or email..."
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="col-md-3">
          <select
            className="form-select"
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Status</option>
            <option value="NEW">NEW</option>
            <option value="CONTACTED">CONTACTED</option>
            <option value="FOLLOW-UP">FOLLOW-UP</option>
            <option value="CLOSED">CLOSED</option>
          </select>
        </div>

        <div className="col-md-3">
          <button onClick={exportExcel} className="btn btn-success w-100">
            Export Excel
          </button>
        </div>

      </div>

      {/* TABLE */}
      <div className="table-responsive admin-table-scroll">

        <table className="table table-hover">

          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Status</th>
              <th>Action</th>
              <th>Source</th>
            </tr>
          </thead>

          <tbody>

            {filteredLeads.map((lead) => (

              <tr key={lead.id}>

                <td>{lead.name}</td>
                <td>{lead.email}</td>
                <td>{lead.phone}</td>

                <td>
                  <select
                    value={lead.status}
                    onChange={(e) =>
                      onStatusChange(lead.id, e.target.value)
                    }
                    className="form-select form-select-sm"
                  >
                    <option value="NEW">NEW</option>
                    <option value="CONTACTED">CONTACTED</option>
                    <option value="FOLLOW-UP">FOLLOW-UP</option>
                    <option value="CLOSED">CLOSED</option>
                  </select>
                </td>

                <td>
                  <a
                    href={`https://wa.me/91${lead.phone}`}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-success btn-sm me-2"
                  >
                    WhatsApp
                  </a>

                  <button
                    onClick={() => onDelete(lead.id)}
                    className="btn btn-danger btn-sm"
                  >
                    Delete
                  </button>
                </td>
                {/* ✅ SOURCE COLUMN */}
                <td>
                  <span className={`badge ${lead.source === "WHATSAPP" ? "bg-success" : "bg-primary"}`}>
                    {lead.source}
                  </span>
                </td>

              </tr>

            ))}

          </tbody>

        </table>

      </div>
    </>
  );
}

export default LeadTable;
