import React, { useEffect, useState } from "react";
import { api } from "../api/client";
import DataTable from "../components/DataTable";
import ConfirmDialog from "../components/ConfirmDialog";
import { useToast } from "../components/Toast";

export default function MaintenanceDashboardPage() {
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [resolveOpen, setResolveOpen] = useState(false);
  const [selectedCase, setSelectedCase] = useState(null);
  const [resolution, setResolution] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const toast = useToast();

  async function load() {
    setLoading(true);
    try {
      const data = await api("/admin/maintenance-cases");
      setCases(data.cases || []);
    } catch (e) {
      toast.showToast(e.message || "Failed to load maintenance cases", "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load().catch(() => {}); }, []);

  async function submitResolution() {
    if (!selectedCase || !resolution.trim()) return;
    setSubmitting(true);
    try {
      await api(`/admin/maintenance-cases/${selectedCase._id}/resolve`, {
        method: "PATCH",
        body: JSON.stringify({ resolution: resolution.trim() })
      });
      toast.showToast("Case resolved successfully", "success");
      setResolveOpen(false);
      setSelectedCase(null);
      setResolution("");
      load();
    } catch (e) {
      toast.showToast(e.message || "Failed to resolve case", "error");
    } finally {
      setSubmitting(false);
    }
  }

  function openResolveModal(caseItem) {
    setSelectedCase(caseItem);
    setResolution("");
    setResolveOpen(true);
  }

  const columns = [
    { key: "tool", label: "Tool", render: (c) => c.tool?.name || "Unknown" },
    { key: "reportedBy", label: "Reported By", render: (c) => c.reportedBy?.fullName || "Unknown" },
    { key: "issue", label: "Issue" },
    { key: "status", label: "Status", render: (c) => (
      <span className={`pill ${c.status}`}>{c.status}</span>
    )},
    { key: "createdAt", label: "Reported", render: (c) => new Date(c.createdAt).toLocaleDateString() },
    {
      key: "actions",
      label: "Actions",
      render: (c) => c.status !== "resolved" ? (
        <button
          onClick={() => openResolveModal(c)}
          style={{ padding: "6px 12px", fontSize: 12, backgroundColor: "#059669", color: "#fff", border: "none", borderRadius: 4, cursor: "pointer" }}
        >
          Resolve
        </button>
      ) : (
        <span className="pill resolved">Resolved</span>
      )
    }
  ];

  const pendingCases = cases.filter(c => c.status !== "resolved").length;
  const totalCost = cases.reduce((sum, c) => sum + (c.totalCost || 0), 0);

  return (
    <section>
      <div className="section-band">
        <h2>Maintenance Dashboard</h2>
        <p>Overview of all maintenance cases, cost allocations, and resolution tracking.</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{cases.length}</div>
          <div className="stat-label">Total Cases</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{pendingCases}</div>
          <div className="stat-label">Pending Cases</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{totalCost.toFixed(0)}</div>
          <div className="stat-label">Total Points Allocated</div>
        </div>
      </div>

      <DataTable
        rows={cases}
        columns={columns}
        loading={loading}
        emptyMessage="No maintenance cases found"
      />

      <ConfirmDialog
        isOpen={resolveOpen}
        title="Resolve Maintenance Case"
        message={`Mark maintenance case for ${selectedCase?.tool?.name || "this tool"} as resolved?`}
        confirmText="Resolve Case"
        variant="success"
        onConfirm={submitResolution}
        onCancel={() => { setResolveOpen(false); setSelectedCase(null); setResolution(""); }}
      >
        {selectedCase && (
          <div style={{ marginBottom: 16, padding: 12, backgroundColor: "#f7f4ed", borderRadius: 8 }}>
            <p><strong>Tool:</strong> {selectedCase.tool?.name}</p>
            <p><strong>Issue:</strong> {selectedCase.issue}</p>
            <p><strong>Reported By:</strong> {selectedCase.reportedBy?.fullName}</p>
            <p><strong>Total Cost:</strong> {selectedCase.totalCost} points</p>
          </div>
        )}

        {resolveOpen && (
          <div>
            <label style={{ display: "block", marginBottom: 4, fontWeight: 600 }}>
              Resolution Notes
            </label>
            <textarea
              value={resolution}
              onChange={(e) => setResolution(e.target.value)}
              placeholder="Describe how this case was resolved..."
              disabled={submitting}
              rows={4}
              style={{ width: "100%", padding: 8, border: "1px solid #ded8cc", borderRadius: 6, resize: "vertical" }}
            />
          </div>
        )}
      </ConfirmDialog>
    </section>
  );
}