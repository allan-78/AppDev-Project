import React, { useEffect, useState } from "react";
import { Search, ChevronRight, ChevronLeft, X, Check, AlertTriangle, User, Wrench, FileText, Scale, Calendar, DollarSign, Eye, ChevronDown } from "lucide-react";
import { api } from "../api/client";
import DataTable from "../components/DataTable";
import ConfirmDialog from "../components/ConfirmDialog";
import { useToast } from "../components/Toast";

export default function DisputesPage() {
  const [disputes, setDisputes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [selectedDispute, setSelectedDispute] = useState(null);
  const [penaltyPoints, setPenaltyPoints] = useState(10);
  const [resolution, setResolution] = useState("Resolved by community leader.");
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [detailOpen, setDetailOpen] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const toast = useToast();

  async function load() {
    setLoading(true);
    try {
      const data = await api("/disputes");
      setDisputes(data.disputes || []);
    } catch (e) {
      toast.showToast(e.message || "Failed to load disputes", "error");
    } finally {
      setLoading(false);
    }
  }

  function openResolveModal(row) {
    setSelectedDispute(row);
    setPenaltyPoints(10);
    setResolution("Resolved by community leader.");
    setModalOpen(true);
  }

  function openDetail(row) {
    setSelectedDispute(row);
    setDetailOpen(true);
  }

  async function submitResolution(event) {
    event.preventDefault();
    if (!selectedDispute) return;
    setSubmitting(true);
    try {
      await api(`/disputes/${selectedDispute._id}/resolve`, {
        method: "PATCH",
        body: JSON.stringify({ penaltyPoints: Number(penaltyPoints || 0), resolution, status: "resolved" })
      });
      toast.showToast("Dispute resolved", "success");
      setModalOpen(false);
      setConfirmOpen(false);
      if (detailOpen) setDetailOpen(false);
      load();
    } catch (err) {
      toast.showToast(err.message || "Failed to resolve dispute", "error");
    } finally {
      setSubmitting(false);
    }
  }

  useEffect(() => { load().catch(console.error); }, []);

  const openCount = disputes.filter(d => d.status !== "resolved" && d.status !== "closed").length;
  const resolvedCount = disputes.filter(d => d.status === "resolved" || d.status === "closed").length;

  const filtered = disputes.filter((d) => {
    const term = search.toLowerCase();
    const matchesSearch = (d.tool?.name || "").toLowerCase().includes(term) || 
                          (d.reportedBy?.fullName || "").toLowerCase().includes(term) ||
                          (d.type || "").toLowerCase().includes(term);
    if (statusFilter === "open") return matchesSearch && d.status !== "resolved" && d.status !== "closed";
    if (statusFilter === "resolved") return matchesSearch && (d.status === "resolved" || d.status === "closed");
    return matchesSearch;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageSafe = Math.min(page, totalPages);
  const pageItems = filtered.slice((pageSafe - 1) * pageSize, pageSafe * pageSize);

  return (
    <section>
      {/* Summary Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 20 }}>
        <div style={{ backgroundColor: "#f7f4ed", borderRadius: 12, padding: 14 }}>
          <FileText size={18} color="#0b1f33" />
          <div style={{ fontSize: 24, fontWeight: "900", color: "#0b1f33", marginTop: 6 }}>{disputes.length}</div>
          <div style={{ fontSize: 10, color: "#475569", fontWeight: "700", textTransform: "uppercase" }}>Total Disputes</div>
        </div>
        <div style={{ backgroundColor: "#fef2f2", borderRadius: 12, padding: 14 }}>
          <AlertTriangle size={18} color="#ef4444" />
          <div style={{ fontSize: 24, fontWeight: "900", color: "#ef4444", marginTop: 6 }}>{openCount}</div>
          <div style={{ fontSize: 10, color: "#475569", fontWeight: "700", textTransform: "uppercase" }}>Open</div>
        </div>
        <div style={{ backgroundColor: "#e8f7ef", borderRadius: 12, padding: 14 }}>
          <Check size={18} color="#059669" />
          <div style={{ fontSize: 24, fontWeight: "900", color: "#059669", marginTop: 6 }}>{resolvedCount}</div>
          <div style={{ fontSize: 10, color: "#475569", fontWeight: "700", textTransform: "uppercase" }}>Resolved</div>
        </div>
      </div>

      {/* Filters */}
      <div className="toolbar" style={{ marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
        <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
          <Search size={16} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
          <input placeholder="Search by tool, reporter, or type..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} style={{ paddingLeft: 36, width: "100%" }} />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ padding: "8px 12px", border: "1px solid #ded8cc", borderRadius: 6, fontSize: 13, backgroundColor: "#fff" }}>
          <option value="all">All Status</option>
          <option value="open">Open</option>
          <option value="resolved">Resolved</option>
        </select>
        <button onClick={load} style={{ padding: "8px 16px", backgroundColor: "#0b1f33", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 12, fontWeight: "700" }}>Refresh</button>
      </div>

      {/* Disputes Table */}
      <div style={{ overflowX: "auto" }}>
        <table className="data-table" style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ backgroundColor: "#f7f4ed" }}>
              <th style={{ padding: "10px 12px", textAlign: "left", fontSize: 11, fontWeight: "700", color: "#0b1f33", textTransform: "uppercase" }}>Tool</th>
              <th style={{ padding: "10px 12px", textAlign: "left", fontSize: 11, fontWeight: "700", color: "#0b1f33", textTransform: "uppercase" }}>Type</th>
              <th style={{ padding: "10px 12px", textAlign: "left", fontSize: 11, fontWeight: "700", color: "#0b1f33", textTransform: "uppercase" }}>Reporter</th>
              <th style={{ padding: "10px 12px", textAlign: "left", fontSize: 11, fontWeight: "700", color: "#0b1f33", textTransform: "uppercase" }}>Against</th>
              <th style={{ padding: "10px 12px", textAlign: "left", fontSize: 11, fontWeight: "700", color: "#0b1f33", textTransform: "uppercase" }}>Status</th>
              <th style={{ padding: "10px 12px", textAlign: "left", fontSize: 11, fontWeight: "700", color: "#0b1f33", textTransform: "uppercase" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={{ padding: 40, textAlign: "center", color: "#64748b" }}>Loading disputes...</td></tr>
            ) : pageItems.length === 0 ? (
              <tr><td colSpan={6} style={{ padding: 40, textAlign: "center", color: "#64748b" }}>No disputes found</td></tr>
            ) : (
              pageItems.map((d, i) => (
                <tr key={d._id || i} style={{ borderBottom: "1px solid #f1f5f9", cursor: "pointer" }} onClick={() => openDetail(d)}>
                  <td style={{ padding: "12px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <Wrench size={16} color="#64748b" />
                      </div>
                      <span style={{ fontSize: 13, fontWeight: "700", color: "#0b1f33" }}>{d.tool?.name || "Unknown"}</span>
                    </div>
                  </td>
                  <td style={{ padding: "12px" }}>
                    <span style={{ backgroundColor: "#f1f5f9", padding: "3px 8px", borderRadius: 4, fontSize: 11, color: "#475569", textTransform: "capitalize" }}>{d.type}</span>
                  </td>
                  <td style={{ padding: "12px", fontSize: 12, color: "#475569" }}>{d.reportedBy?.fullName || "Unknown"}</td>
                  <td style={{ padding: "12px", fontSize: 12, color: "#475569" }}>{d.againstUser?.fullName || "N/A"}</td>
                  <td style={{ padding: "12px" }}><span className={`pill ${d.status}`} style={{ fontSize: 10 }}>{d.status}</span></td>
                  <td style={{ padding: "12px" }} onClick={(e) => e.stopPropagation()}>
                    <div style={{ display: "flex", gap: 4 }}>
                      <button title="View" onClick={() => openDetail(d)} style={{ padding: "6px", backgroundColor: "#f1f5f9", border: "none", borderRadius: 4, cursor: "pointer", color: "#0b1f33" }}>
                        <Eye size={14} />
                      </button>
                      {d.status !== "resolved" && d.status !== "closed" && (
                        <button title="Resolve" onClick={() => { setDetailOpen(false); openResolveModal(d); }} style={{ padding: "6px", backgroundColor: "#e8f7ef", border: "none", borderRadius: 4, cursor: "pointer", color: "#059669" }}>
                          <Check size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div style={{ marginTop: 16, display: "flex", justifyContent: "center", gap: 12 }}>
        <button disabled={pageSafe <= 1} onClick={() => setPage(p => Math.max(1, p - 1))} style={{ padding: "8px 16px", border: "1px solid #ded8cc", borderRadius: 6, backgroundColor: "#fff", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
          <ChevronLeft size={14} /> Prev
        </button>
        <span style={{ fontSize: 13, color: "#64748b" }}>Page {pageSafe} of {totalPages}</span>
        <button disabled={pageSafe >= totalPages} onClick={() => setPage(p => p + 1)} style={{ padding: "8px 16px", border: "1px solid #ded8cc", borderRadius: 6, backgroundColor: "#fff", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
          Next <ChevronRight size={14} />
        </button>
      </div>

      {/* Dispute Detail Modal */}
      {detailOpen && selectedDispute && (
        <div className="modal-overlay" onClick={() => setDetailOpen(false)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 600 }}>
            <div className="modal-header">
              <h3>Dispute Details</h3>
              <button className="modal-close-btn" onClick={() => setDetailOpen(false)}><X size={20} /></button>
            </div>
            <div className="modal-body">
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20, padding: 16, backgroundColor: "#fef2f2", borderRadius: 12, border: "1px solid #fecaca" }}>
                <AlertTriangle size={24} color="#ef4444" />
                <div>
                  <h2 style={{ margin: 0, fontSize: 16, color: "#ef4444" }}>{selectedDispute.tool?.name || "Unknown"}</h2>
                  <span className={`pill ${selectedDispute.status}`} style={{ fontSize: 10, marginTop: 4 }}>{selectedDispute.status}</span>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
                {[
                  { icon: AlertTriangle, label: "Type", value: selectedDispute.type },
                  { icon: User, label: "Reported By", value: selectedDispute.reportedBy?.fullName || "Unknown" },
                  { icon: User, label: "Against", value: selectedDispute.againstUser?.fullName || "N/A" },
                  { icon: Calendar, label: "Created", value: selectedDispute.createdAt ? new Date(selectedDispute.createdAt).toLocaleDateString() : "N/A" }
                ].map((item, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: 10, backgroundColor: "#faf9f7", borderRadius: 8 }}>
                    <item.icon size={16} color="#64748b" />
                    <div>
                      <div style={{ fontSize: 10, color: "#94a3b8", textTransform: "uppercase", fontWeight: "600" }}>{item.label}</div>
                      <div style={{ fontSize: 13, color: "#475569" }}>{item.value}</div>
                    </div>
                  </div>
                ))}
              </div>
              {selectedDispute.description && (
                <div style={{ marginBottom: 16, padding: 12, backgroundColor: "#f7f4ed", borderRadius: 8 }}>
                  <div style={{ fontSize: 10, color: "#94a3b8", textTransform: "uppercase", fontWeight: "600", marginBottom: 4 }}>Description</div>
                  <div style={{ fontSize: 13, color: "#475569" }}>{selectedDispute.description}</div>
                </div>
              )}
              {selectedDispute.status !== "resolved" && selectedDispute.status !== "closed" && (
                <div style={{ borderTop: "1px solid #ded8cc", paddingTop: 16 }}>
                  <button className="primary" onClick={() => { setDetailOpen(false); openResolveModal(selectedDispute); }} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <Check size={16} /> Resolve Dispute
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Resolve Modal */}
      {modalOpen && (
        <div className="modal-overlay">
          <div className="modal-container" style={{ maxWidth: 500 }}>
            <div className="modal-header">
              <h2>Resolve Dispute</h2>
              <button className="modal-close-btn" onClick={() => setModalOpen(false)}><X size={18} /></button>
            </div>
            <form onSubmit={submitResolution}>
              <div className="modal-body">
                <div style={{ padding: 12, backgroundColor: "#fffbeb", borderRadius: 8, border: "1px solid #fcd34d", marginBottom: 16 }}>
                  <p style={{ margin: 0, fontSize: 13, color: "#92400e" }}>
                    Resolving for <strong>{selectedDispute?.tool?.name || "this tool"}</strong> reported by {selectedDispute?.reportedBy?.fullName}.
                  </p>
                </div>
                <div style={{ marginBottom: 12 }}>
                  <label style={{ fontSize: 12, fontWeight: "700", color: "#64748b", display: "block", marginBottom: 4 }}>Penalty Points</label>
                  <input type="number" value={penaltyPoints} onChange={(e) => setPenaltyPoints(e.target.value)} min="0" max="100" disabled={submitting} required
                    style={{ padding: "10px 14px", border: "1px solid #ded8cc", borderRadius: 8, fontSize: 13, width: "100%" }} />
                </div>
                <div style={{ marginBottom: 12 }}>
                  <label style={{ fontSize: 12, fontWeight: "700", color: "#64748b", display: "block", marginBottom: 4 }}>Resolution Note</label>
                  <textarea value={resolution} onChange={(e) => setResolution(e.target.value)} disabled={submitting} required rows={3}
                    style={{ padding: "10px 14px", border: "1px solid #ded8cc", borderRadius: 8, fontSize: 13, width: "100%", resize: "vertical" }} />
                </div>
              </div>
              <div className="modal-footer" style={{ display: "flex", gap: 8, justifyContent: "flex-end", padding: "12px 16px", borderTop: "1px solid #ded8cc" }}>
                <button type="button" className="cancel" onClick={() => setModalOpen(false)} disabled={submitting}
                  style={{ padding: "10px 16px", border: "1px solid #ded8cc", borderRadius: 6, backgroundColor: "#fff", cursor: "pointer", fontSize: 12, fontWeight: "600" }}>
                  Cancel
                </button>
                <button type="submit" disabled={submitting}
                  style={{ padding: "10px 16px", backgroundColor: "#0b1f33", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 12, fontWeight: "600" }}>
                  {submitting ? "Resolving..." : "Submit Resolution"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}