import React, { useEffect, useState } from "react";
import { Search, ChevronRight, ChevronLeft, X, Check, AlertTriangle, Wrench, User, DollarSign, Calendar, Eye, Activity, Settings, Clock, Plus } from "lucide-react";
import { api } from "../api/client";
import DataTable from "../components/DataTable";
import ConfirmDialog from "../components/ConfirmDialog";
import { useToast } from "../components/Toast";

export default function MaintenancePage() {
  const [cases, setCases] = useState([]);
  const [tools, setTools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ tool: "", issue: "", estimatedPointCost: 50 });
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingCase, setPendingCase] = useState(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedCase, setSelectedCase] = useState(null);
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const toast = useToast();

  async function load() {
    setLoading(true);
    try {
      const [maintenanceData, toolData] = await Promise.all([api("/maintenance"), api("/tools")]);
      setCases(maintenanceData.cases || []);
      setTools(toolData.tools || []);
      if (!form.tool && toolData.tools[0]) setForm((current) => ({ ...current, tool: toolData.tools[0]._id }));
    } catch (e) {
      toast.showToast(e.message || "Failed to load data", "error");
    } finally {
      setLoading(false);
    }
  }

  async function submit(event) {
    event.preventDefault();
    if (!form.tool || !form.issue.trim()) {
      toast.showToast("Select a tool and describe the issue", "error");
      return;
    }
    try {
      await api("/maintenance", { method: "POST", body: JSON.stringify(form) });
      setForm({ ...form, issue: "" });
      toast.showToast("Maintenance case created", "success");
      load();
    } catch (e) {
      toast.showToast(e.message || "Failed to create case", "error");
    }
  }

  async function resolveCase(maintenanceCase) {
    try {
      await api(`/maintenance/${maintenanceCase._id}/resolve`, { method: "PATCH" });
      toast.showToast("Maintenance case resolved", "success");
      if (detailOpen) setDetailOpen(false);
      load();
    } catch (e) {
      toast.showToast(e.message || "Failed to resolve case", "error");
    } finally {
      setConfirmOpen(false);
      setPendingCase(null);
    }
  }

  function openDetail(mc) {
    setSelectedCase(mc);
    setDetailOpen(true);
  }

  useEffect(() => { load().catch(console.error); }, []);

  const activeCases = cases.filter(c => c.status !== "resolved" && c.status !== "closed").length;
  const resolvedCases = cases.filter(c => c.status === "resolved" || c.status === "closed").length;

  const filtered = cases.filter((c) => {
    const term = search.toLowerCase();
    const matchesSearch = (c.tool?.name || "").toLowerCase().includes(term) || (c.issue || "").toLowerCase().includes(term);
    if (statusFilter === "active") return matchesSearch && c.status !== "resolved" && c.status !== "closed";
    if (statusFilter === "resolved") return matchesSearch && (c.status === "resolved" || c.status === "closed");
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
          <Wrench size={18} color="#0b1f33" />
          <div style={{ fontSize: 24, fontWeight: "900", color: "#0b1f33", marginTop: 6 }}>{cases.length}</div>
          <div style={{ fontSize: 10, color: "#475569", fontWeight: "700", textTransform: "uppercase" }}>Total Cases</div>
        </div>
        <div style={{ backgroundColor: "#fffbeb", borderRadius: 12, padding: 14 }}>
          <AlertTriangle size={18} color="#d97706" />
          <div style={{ fontSize: 24, fontWeight: "900", color: "#d97706", marginTop: 6 }}>{activeCases}</div>
          <div style={{ fontSize: 10, color: "#475569", fontWeight: "700", textTransform: "uppercase" }}>Active</div>
        </div>
        <div style={{ backgroundColor: "#e8f7ef", borderRadius: 12, padding: 14 }}>
          <Check size={18} color="#059669" />
          <div style={{ fontSize: 24, fontWeight: "900", color: "#059669", marginTop: 6 }}>{resolvedCases}</div>
          <div style={{ fontSize: 10, color: "#475569", fontWeight: "700", textTransform: "uppercase" }}>Resolved</div>
        </div>
        <div style={{ backgroundColor: "#eff6ff", borderRadius: 12, padding: 14 }}>
          <Wrench size={18} color="#3b82f6" />
          <div style={{ fontSize: 24, fontWeight: "900", color: "#3b82f6", marginTop: 6 }}>{tools.length}</div>
          <div style={{ fontSize: 10, color: "#475569", fontWeight: "700", textTransform: "uppercase" }}>Available Tools</div>
        </div>
      </div>

      {/* Create Form */}
      <form onSubmit={submit} style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16, padding: 14, backgroundColor: "#fff", borderRadius: 12, border: "1px solid #e2e8f0" }}>
        <div style={{ flex: 2, minWidth: 150 }}>
          <label style={{ fontSize: 10, fontWeight: "700", color: "#64748b", textTransform: "uppercase", marginBottom: 4, display: "block" }}>Tool</label>
          <select value={form.tool} onChange={(e) => setForm({ ...form, tool: e.target.value })} style={{ padding: "8px 10px", border: "1px solid #ded8cc", borderRadius: 6, fontSize: 13, width: "100%", backgroundColor: "#fff" }}>
            {tools.map((tool) => <option key={tool._id} value={tool._id}>{tool.name}</option>)}
          </select>
        </div>
        <div style={{ flex: 3, minWidth: 200 }}>
          <label style={{ fontSize: 10, fontWeight: "700", color: "#64748b", textTransform: "uppercase", marginBottom: 4, display: "block" }}>Issue Description</label>
          <input placeholder="Describe the maintenance issue..." value={form.issue} onChange={(e) => setForm({ ...form, issue: e.target.value })} style={{ padding: "8px 10px", border: "1px solid #ded8cc", borderRadius: 6, fontSize: 13, width: "100%" }} />
        </div>
        <div style={{ flex: 1, minWidth: 100 }}>
          <label style={{ fontSize: 10, fontWeight: "700", color: "#64748b", textTransform: "uppercase", marginBottom: 4, display: "block" }}>Est. Cost (pts)</label>
          <input type="number" value={form.estimatedPointCost} onChange={(e) => setForm({ ...form, estimatedPointCost: Number(e.target.value) })} style={{ padding: "8px 10px", border: "1px solid #ded8cc", borderRadius: 6, fontSize: 13, width: "100%" }} />
        </div>
        <div style={{ display: "flex", alignItems: "flex-end" }}>
          <button type="submit" style={{ padding: "8px 16px", backgroundColor: "#0b1f33", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 12, fontWeight: "700", display: "flex", alignItems: "center", gap: 6 }}>
            <Plus size={14} /> Create Case
          </button>
        </div>
      </form>

      {/* Filters */}
      <div className="toolbar" style={{ marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
        <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
          <Search size={16} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
          <input placeholder="Search by tool or issue..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} style={{ paddingLeft: 36, width: "100%" }} />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ padding: "8px 12px", border: "1px solid #ded8cc", borderRadius: 6, fontSize: 13, backgroundColor: "#fff" }}>
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="resolved">Resolved</option>
        </select>
        <button onClick={load} style={{ padding: "8px 16px", backgroundColor: "#0b1f33", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 12, fontWeight: "700" }}>Refresh</button>
      </div>

      {/* Cases Table */}
      <div style={{ overflowX: "auto" }}>
        <table className="data-table" style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ backgroundColor: "#f7f4ed" }}>
              <th style={{ padding: "10px 12px", textAlign: "left", fontSize: 11, fontWeight: "700", color: "#0b1f33", textTransform: "uppercase" }}>Tool</th>
              <th style={{ padding: "10px 12px", textAlign: "left", fontSize: 11, fontWeight: "700", color: "#0b1f33", textTransform: "uppercase" }}>Issue</th>
              <th style={{ padding: "10px 12px", textAlign: "left", fontSize: 11, fontWeight: "700", color: "#0b1f33", textTransform: "uppercase" }}>Cost</th>
              <th style={{ padding: "10px 12px", textAlign: "left", fontSize: 11, fontWeight: "700", color: "#0b1f33", textTransform: "uppercase" }}>Allocations</th>
              <th style={{ padding: "10px 12px", textAlign: "left", fontSize: 11, fontWeight: "700", color: "#0b1f33", textTransform: "uppercase" }}>Status</th>
              <th style={{ padding: "10px 12px", textAlign: "left", fontSize: 11, fontWeight: "700", color: "#0b1f33", textTransform: "uppercase" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={{ padding: 40, textAlign: "center", color: "#64748b" }}>Loading maintenance cases...</td></tr>
            ) : pageItems.length === 0 ? (
              <tr><td colSpan={6} style={{ padding: 40, textAlign: "center", color: "#64748b" }}>No maintenance cases</td></tr>
            ) : (
              pageItems.map((c, i) => (
                <tr key={c._id || i} style={{ borderBottom: "1px solid #f1f5f9", cursor: "pointer" }} onClick={() => openDetail(c)}>
                  <td style={{ padding: "12px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <Wrench size={16} color="#64748b" />
                      </div>
                      <span style={{ fontSize: 13, fontWeight: "700", color: "#0b1f33" }}>{c.tool?.name || "Unknown"}</span>
                    </div>
                  </td>
                  <td style={{ padding: "12px", fontSize: 12, color: "#475569", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis" }}>{c.issue}</td>
                  <td style={{ padding: "12px", fontWeight: "700", fontSize: 12, color: "#0b1f33" }}>{c.estimatedPointCost} pts</td>
                  <td style={{ padding: "12px", fontSize: 11, color: "#64748b", maxWidth: 150 }}>
                    {c.allocations?.length ? c.allocations.map((a) => `${a.user?.fullName || "?"}: ${a.pointShare}`).join(", ") : "No allocations"}
                  </td>
                  <td style={{ padding: "12px" }}><span className={`pill ${c.status}`} style={{ fontSize: 10 }}>{c.status}</span></td>
                  <td style={{ padding: "12px" }} onClick={(e) => e.stopPropagation()}>
                    <div style={{ display: "flex", gap: 4 }}>
                      <button title="View" onClick={() => openDetail(c)} style={{ padding: "6px", backgroundColor: "#f1f5f9", border: "none", borderRadius: 4, cursor: "pointer", color: "#0b1f33" }}>
                        <Eye size={14} />
                      </button>
                      {c.status !== "resolved" && c.status !== "closed" && (
                        <button title="Resolve" onClick={() => { setPendingCase(c); setConfirmOpen(true); }} style={{ padding: "6px", backgroundColor: "#e8f7ef", border: "none", borderRadius: 4, cursor: "pointer", color: "#059669" }}>
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

      {/* Detail Modal */}
      {detailOpen && selectedCase && (
        <div className="modal-overlay" onClick={() => setDetailOpen(false)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 600 }}>
            <div className="modal-header">
              <h3>Maintenance Case</h3>
              <button className="modal-close-btn" onClick={() => setDetailOpen(false)}><X size={20} /></button>
            </div>
            <div className="modal-body">
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20, padding: 16, backgroundColor: "#fffbeb", borderRadius: 12, border: "1px solid #fcd34d" }}>
                <Wrench size={24} color="#d97706" />
                <div>
                  <h2 style={{ margin: 0, fontSize: 16, color: "#0b1f33" }}>{selectedCase.tool?.name || "Unknown"}</h2>
                  <span className={`pill ${selectedCase.status}`} style={{ fontSize: 10, marginTop: 4 }}>{selectedCase.status}</span>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
                {[
                  { icon: DollarSign, label: "Estimated Cost", value: `${selectedCase.estimatedPointCost} pts`, color: "#0b1f33", bold: true },
                  { icon: Calendar, label: "Created", value: selectedCase.createdAt ? new Date(selectedCase.createdAt).toLocaleDateString() : "N/A" },
                  { icon: Calendar, label: "Resolved", value: selectedCase.resolvedAt ? new Date(selectedCase.resolvedAt).toLocaleDateString() : "Not yet" },
                  { icon: Activity, label: "Allocations", value: selectedCase.allocations?.length ? `${selectedCase.allocations.length} user(s)` : "None" }
                ].map((item, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: 10, backgroundColor: "#faf9f7", borderRadius: 8 }}>
                    <item.icon size={16} color="#64748b" />
                    <div>
                      <div style={{ fontSize: 10, color: "#94a3b8", textTransform: "uppercase", fontWeight: "600" }}>{item.label}</div>
                      <div style={{ fontSize: 13, color: item.color || "#475569", fontWeight: item.bold ? "700" : "400" }}>{item.value}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ marginBottom: 16, padding: 12, backgroundColor: "#f7f4ed", borderRadius: 8 }}>
                <div style={{ fontSize: 10, color: "#94a3b8", textTransform: "uppercase", fontWeight: "600", marginBottom: 4 }}>Issue Description</div>
                <div style={{ fontSize: 13, color: "#475569" }}>{selectedCase.issue}</div>
              </div>
              {selectedCase.allocations?.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 10, color: "#94a3b8", textTransform: "uppercase", fontWeight: "600", marginBottom: 6 }}>Cost Allocations</div>
                  {selectedCase.allocations.map((a, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #f1f5f9" }}>
                      <span style={{ fontSize: 12, color: "#475569" }}>{a.user?.fullName || "Unknown"}</span>
                      <span style={{ fontSize: 12, fontWeight: "700", color: "#0b1f33" }}>{a.pointShare} pts</span>
                    </div>
                  ))}
                </div>
              )}
              {selectedCase.status !== "resolved" && selectedCase.status !== "closed" && (
                <div style={{ borderTop: "1px solid #ded8cc", paddingTop: 16 }}>
                  <button className="primary" onClick={() => { setDetailOpen(false); setPendingCase(selectedCase); setConfirmOpen(true); }} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <Check size={16} /> Resolve Case
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={confirmOpen}
        title="Resolve maintenance case"
        message={`Mark maintenance for "${pendingCase?.tool?.name || 'this tool'}" as resolved?`}
        confirmText="Resolve"
        variant="info"
        onConfirm={() => resolveCase(pendingCase)}
        onCancel={() => { setConfirmOpen(false); setPendingCase(null); }}
      />
    </section>
  );
}