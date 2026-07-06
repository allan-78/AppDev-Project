import React, { useEffect, useState } from "react";
import { Search, ChevronRight, ChevronLeft, FileText, User, Calendar, Clock, Filter, Eye, Activity, Shield, AlertTriangle, CheckCircle, RefreshCcw } from "lucide-react";
import { api } from "../api/client";
import DataTable from "../components/DataTable";
import { useToast } from "../components/Toast";

const actionIcons = {
  "user.status": Shield,
  "user.create": User,
  "user.delete": User,
  "tool.create": Activity,
  "tool.update": Activity,
  "tool.disable": AlertTriangle,
  "borrow.request": FileText,
  "borrow.verification": CheckCircle,
  "borrow.pickup": Activity,
  "borrow.return": CheckCircle,
  "borrow.complete": CheckCircle,
  "borrow.complaint": AlertTriangle,
  "dispute.create": AlertTriangle,
  "dispute.resolve": CheckCircle,
  "community.create": Activity,
  "community.join": User,
  "community.request": FileText
};

function getActionColor(action) {
  if (!action) return "#64748b";
  if (action.includes("delete") || action.includes("disable") || action.includes("complaint") || action.includes("dispute")) return "#ef4444";
  if (action.includes("create") || action.includes("resolve") || action.includes("complete") || action.includes("verify")) return "#059669";
  if (action.includes("update") || action.includes("status") || action.includes("request")) return "#3b82f6";
  if (action.includes("join") || action.includes("return")) return "#8b5cf6";
  return "#64748b";
}

export default function ActivityLogPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ action: "", user: "", startDate: "", endDate: "" });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedLog, setSelectedLog] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const pageSize = 20;
  const toast = useToast();

  async function load(isNewFilter) {
    if (isNewFilter) setPage(1);
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter.action) params.set("action", filter.action);
      if (filter.user) params.set("user", filter.user);
      if (filter.startDate) params.set("startDate", filter.startDate);
      if (filter.endDate) params.set("endDate", filter.endDate);
      params.set("page", isNewFilter ? 1 : page);
      params.set("limit", pageSize);

      const data = await api(`/admin/audit-logs?${params.toString()}`);
      setLogs(data.logs || []);
      if (data.pagination) {
        setTotalPages(data.pagination.pages || 1);
      }
    } catch (e) {
      toast.showToast(e.message || "Failed to load activity logs", "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(true).catch(() => {}); }, [filter]);

  const uniqueActions = [...new Set(logs.map(l => l.action))];
  const pageSafe = Math.min(page, totalPages);

  return (
    <section>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 20, color: "#0b1f33", display: "flex", alignItems: "center", gap: 8 }}>
              <Activity size={20} /> Activity Log
            </h1>
            <p style={{ margin: "4px 0 0", fontSize: 13, color: "#64748b" }}>Complete audit trail of all admin and user actions</p>
          </div>
          <button onClick={() => { load(true); }} style={{ padding: "8px 16px", backgroundColor: "#f1f5f9", color: "#0b1f33", border: "1px solid #ded8cc", borderRadius: 6, cursor: "pointer", fontSize: 12, fontWeight: "600", display: "flex", alignItems: "center", gap: 6 }}>
            <RefreshCcw size={14} /> Refresh
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginBottom: 20 }}>
        {[
          { label: "Total Entries", value: logs.length || 0, icon: FileText, color: "#0b1f33", bg: "#f7f4ed" },
          { label: "Unique Actions", value: uniqueActions.length || 0, icon: Activity, color: "#3b82f6", bg: "#eff6ff" },
          { label: "Current Page", value: pageSafe, icon: ChevronRight, color: "#059669", bg: "#e8f7ef" }
        ].map((card, i) => (
          <div key={i} style={{ backgroundColor: card.bg, borderRadius: 12, padding: 14 }}>
            <card.icon size={18} color={card.color} />
            <div style={{ fontSize: 22, fontWeight: "900", color: card.color, marginTop: 6 }}>{card.value}</div>
            <div style={{ fontSize: 10, color: "#475569", fontWeight: "700", textTransform: "uppercase" }}>{card.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16, padding: 14, backgroundColor: "#fff", borderRadius: 12, border: "1px solid #e2e8f0" }}>
        <div style={{ flex: 1, minWidth: 150 }}>
          <label style={{ fontSize: 10, fontWeight: "700", color: "#64748b", textTransform: "uppercase", marginBottom: 4, display: "block" }}>Action Type</label>
          <select value={filter.action} onChange={(e) => setFilter({ ...filter, action: e.target.value })} style={{ padding: "8px 10px", border: "1px solid #ded8cc", borderRadius: 6, fontSize: 13, width: "100%", backgroundColor: "#fff" }}>
            <option value="">All Actions</option>
            {uniqueActions.map(action => (
              <option key={action} value={action}>{action}</option>
            ))}
          </select>
        </div>
        <div style={{ flex: 1, minWidth: 150 }}>
          <label style={{ fontSize: 10, fontWeight: "700", color: "#64748b", textTransform: "uppercase", marginBottom: 4, display: "block" }}>User</label>
          <input type="text" value={filter.user} onChange={(e) => setFilter({ ...filter, user: e.target.value })} placeholder="Filter by user name"
            style={{ padding: "8px 10px", border: "1px solid #ded8cc", borderRadius: 6, fontSize: 13, width: "100%" }} />
        </div>
        <div style={{ flex: 1, minWidth: 130 }}>
          <label style={{ fontSize: 10, fontWeight: "700", color: "#64748b", textTransform: "uppercase", marginBottom: 4, display: "block" }}>Start Date</label>
          <input type="date" value={filter.startDate} onChange={(e) => setFilter({ ...filter, startDate: e.target.value })}
            style={{ padding: "8px 10px", border: "1px solid #ded8cc", borderRadius: 6, fontSize: 13, width: "100%" }} />
        </div>
        <div style={{ flex: 1, minWidth: 130 }}>
          <label style={{ fontSize: 10, fontWeight: "700", color: "#64748b", textTransform: "uppercase", marginBottom: 4, display: "block" }}>End Date</label>
          <input type="date" value={filter.endDate} onChange={(e) => setFilter({ ...filter, endDate: e.target.value })}
            style={{ padding: "8px 10px", border: "1px solid #ded8cc", borderRadius: 6, fontSize: 13, width: "100%" }} />
        </div>
      </div>

      {/* Logs Table */}
      <div style={{ overflowX: "auto" }}>
        <table className="data-table" style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ backgroundColor: "#f7f4ed" }}>
              <th style={{ padding: "10px 12px", textAlign: "left", fontSize: 11, fontWeight: "700", color: "#0b1f33", textTransform: "uppercase" }}>Timestamp</th>
              <th style={{ padding: "10px 12px", textAlign: "left", fontSize: 11, fontWeight: "700", color: "#0b1f33", textTransform: "uppercase" }}>User</th>
              <th style={{ padding: "10px 12px", textAlign: "left", fontSize: 11, fontWeight: "700", color: "#0b1f33", textTransform: "uppercase" }}>Action</th>
              <th style={{ padding: "10px 12px", textAlign: "left", fontSize: 11, fontWeight: "700", color: "#0b1f33", textTransform: "uppercase" }}>Target</th>
              <th style={{ padding: "10px 12px", textAlign: "left", fontSize: 11, fontWeight: "700", color: "#0b1f33", textTransform: "uppercase" }}>Details</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} style={{ padding: 40, textAlign: "center", color: "#64748b" }}>Loading activity logs...</td></tr>
            ) : logs.length === 0 ? (
              <tr><td colSpan={5} style={{ padding: 40, textAlign: "center", color: "#64748b" }}>No activity logs found</td></tr>
            ) : (
              logs.map((l, i) => {
                const ActionIcon = actionIcons[l.action] || Activity;
                const actionColor = getActionColor(l.action);
                return (
                  <tr key={l._id || i} style={{ borderBottom: "1px solid #f1f5f9", cursor: "pointer" }} onClick={() => { setSelectedLog(l); setDetailOpen(true); }}>
                    <td style={{ padding: "12px", fontSize: 11, color: "#64748b", whiteSpace: "nowrap" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <Clock size={12} color="#94a3b8" />
                        {new Date(l.createdAt).toLocaleString()}
                      </div>
                    </td>
                    <td style={{ padding: "12px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <div style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: "#0b1f33", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <span style={{ color: "#fff", fontSize: 10, fontWeight: "700" }}>{(l.actor?.fullName || "S").charAt(0).toUpperCase()}</span>
                        </div>
                        <span style={{ fontSize: 12, color: "#0b1f33", fontWeight: "600" }}>{l.actor?.fullName || "System"}</span>
                      </div>
                    </td>
                    <td style={{ padding: "12px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <ActionIcon size={12} color={actionColor} />
                        <span style={{ fontSize: 12, color: "#475569" }}>{l.action}</span>
                      </div>
                    </td>
                    <td style={{ padding: "12px", fontSize: 12, color: "#475569" }}>{l.targetType || "N/A"}</td>
                    <td style={{ padding: "12px", fontSize: 11, color: "#64748b", maxWidth: 250, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {l.details ? (typeof l.details === "object" ? JSON.stringify(l.details).slice(0, 80) : String(l.details).slice(0, 80)) : "-"}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div style={{ marginTop: 16, display: "flex", justifyContent: "center", gap: 12 }}>
        <button disabled={pageSafe <= 1} onClick={() => { setPage(p => Math.max(1, p - 1)); load(false); }} style={{ padding: "8px 16px", border: "1px solid #ded8cc", borderRadius: 6, backgroundColor: "#fff", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
          <ChevronLeft size={14} /> Prev
        </button>
        <span style={{ fontSize: 13, color: "#64748b" }}>Page {pageSafe} of {totalPages}</span>
        <button disabled={pageSafe >= totalPages} onClick={() => { setPage(p => p + 1); load(false); }} style={{ padding: "8px 16px", border: "1px solid #ded8cc", borderRadius: 6, backgroundColor: "#fff", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
          Next <ChevronRight size={14} />
        </button>
      </div>

      {/* Log Detail Modal */}
      {detailOpen && selectedLog && (
        <div className="modal-overlay" onClick={() => setDetailOpen(false)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 500 }}>
            <div className="modal-header">
              <h3>Activity Detail</h3>
              <button className="modal-close-btn" onClick={() => setDetailOpen(false)}><RefreshCcw size={20} /></button>
            </div>
            <div className="modal-body">
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16, padding: 12, backgroundColor: "#f7f4ed", borderRadius: 8 }}>
                <Activity size={20} color={getActionColor(selectedLog.action)} />
                <div>
                  <div style={{ fontSize: 14, fontWeight: "700", color: "#0b1f33" }}>{selectedLog.action}</div>
                  <div style={{ fontSize: 11, color: "#64748b" }}>{new Date(selectedLog.createdAt).toLocaleString()}</div>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
                {[
                  { icon: User, label: "Actor", value: selectedLog.actor?.fullName || "System" },
                  { icon: Activity, label: "Target Type", value: selectedLog.targetType || "N/A" },
                  { icon: FileText, label: "Target ID", value: selectedLog.targetId || "N/A" },
                  { icon: Calendar, label: "Date", value: new Date(selectedLog.createdAt).toLocaleDateString() }
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
              {selectedLog.details && (
                <div style={{ marginBottom: 16, padding: 12, backgroundColor: "#f7f4ed", borderRadius: 8 }}>
                  <div style={{ fontSize: 10, color: "#94a3b8", textTransform: "uppercase", fontWeight: "600", marginBottom: 4 }}>Details</div>
                  <pre style={{ fontSize: 12, color: "#475569", margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                    {typeof selectedLog.details === "object" ? JSON.stringify(selectedLog.details, null, 2) : selectedLog.details}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}