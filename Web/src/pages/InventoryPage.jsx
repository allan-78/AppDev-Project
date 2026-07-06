import React, { useEffect, useState } from "react";
import { Wrench, Ban, CheckCircle, AlertTriangle, Search, ChevronRight, ChevronLeft, Edit, Trash2, Eye, User, Clock, Activity, DollarSign, Image } from "lucide-react";
import { api } from "../api/client";
import DataTable from "../components/DataTable";
import ConfirmDialog from "../components/ConfirmDialog";
import { useToast } from "../components/Toast";

export default function InventoryPage() {
  const [tools, setTools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingTool, setPendingTool] = useState(null);
  const [selectedTool, setSelectedTool] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState({ name: "", description: "", condition: "", depositPoints: 5, maxBorrowDays: 7 });
  const toast = useToast();

  async function load() {
    setLoading(true);
    try {
      const query = filter ? `?status=${filter}` : "";
      const data = await api(`/tools${query}`);
      setTools(data.tools || []);
    } catch (e) {
      toast.showToast(e.message || "Failed to load tools", "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load().catch(() => {}); }, [filter]);

  async function disable(tool) {
    try {
      await api(`/tools/${tool._id}`, { method: "DELETE" });
      toast.showToast("Tool disabled", "success");
      if (detailOpen) setDetailOpen(false);
      load();
    } catch (e) {
      toast.showToast(e.message || "Failed to disable tool", "error");
    } finally {
      setConfirmOpen(false);
      setPendingTool(null);
    }
  }

  async function updateTool() {
    try {
      await api(`/tools/${selectedTool._id}`, {
        method: "PATCH",
        body: JSON.stringify(editForm)
      });
      toast.showToast("Tool updated", "success");
      setEditMode(false);
      load();
    } catch (e) {
      toast.showToast(e.message || "Failed to update tool", "error");
    }
  }

  function openDetail(tool) {
    setSelectedTool(tool);
    setEditForm({
      name: tool.name || "",
      description: tool.description || "",
      condition: tool.condition || "",
      depositPoints: tool.depositPoints || 5,
      maxBorrowDays: tool.maxBorrowDays || 7
    });
    setEditMode(false);
    setDetailOpen(true);
  }

  const askDisable = (tool) => {
    setPendingTool(tool);
    setConfirmOpen(true);
  };

  const filtered = tools.filter((t) => (t.name || "").toLowerCase().includes(search.toLowerCase()));
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageSafe = Math.min(page, totalPages);
  const pageItems = filtered.slice((pageSafe - 1) * pageSize, pageSafe * pageSize);

  // Stats
  const availableCount = tools.filter(t => t.status === "available").length;
  const borrowedCount = tools.filter(t => t.status === "borrowed" || t.status === "reserved").length;
  const maintenanceCount = tools.filter(t => t.status === "maintenance").length;
  const lowHealthCount = tools.filter(t => (t.healthScore || 100) < 40).length;

  return (
    <section>
      {/* Summary Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 20 }}>
        <div style={{ backgroundColor: "#e8f7ef", borderRadius: 12, padding: 14 }}>
          <Wrench size={18} color="#059669" />
          <div style={{ fontSize: 24, fontWeight: "900", color: "#059669", marginTop: 6 }}>{tools.length}</div>
          <div style={{ fontSize: 10, color: "#475569", fontWeight: "700", textTransform: "uppercase" }}>Total Tools</div>
        </div>
        <div style={{ backgroundColor: "#e8f7ef", borderRadius: 12, padding: 14 }}>
          <CheckCircle size={18} color="#059669" />
          <div style={{ fontSize: 24, fontWeight: "900", color: "#059669", marginTop: 6 }}>{availableCount}</div>
          <div style={{ fontSize: 10, color: "#475569", fontWeight: "700", textTransform: "uppercase" }}>Available</div>
        </div>
        <div style={{ backgroundColor: "#eff6ff", borderRadius: 12, padding: 14 }}>
          <Activity size={18} color="#3b82f6" />
          <div style={{ fontSize: 24, fontWeight: "900", color: "#3b82f6", marginTop: 6 }}>{borrowedCount}</div>
          <div style={{ fontSize: 10, color: "#475569", fontWeight: "700", textTransform: "uppercase" }}>Borrowed</div>
        </div>
        <div style={{ backgroundColor: "#fffbeb", borderRadius: 12, padding: 14 }}>
          <AlertTriangle size={18} color="#d97706" />
          <div style={{ fontSize: 24, fontWeight: "900", color: "#d97706", marginTop: 6 }}>{maintenanceCount}</div>
          <div style={{ fontSize: 10, color: "#475569", fontWeight: "700", textTransform: "uppercase" }}>Maintenance</div>
        </div>
        <div style={{ backgroundColor: "#fef2f2", borderRadius: 12, padding: 14 }}>
          <AlertTriangle size={18} color="#ef4444" />
          <div style={{ fontSize: 24, fontWeight: "900", color: "#ef4444", marginTop: 6 }}>{lowHealthCount}</div>
          <div style={{ fontSize: 10, color: "#475569", fontWeight: "700", textTransform: "uppercase" }}>Low Health</div>
        </div>
      </div>

      {/* Filters */}
      <div className="toolbar" style={{ marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
        <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
          <Search size={16} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
          <input
            placeholder="Search tools by name..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            style={{ paddingLeft: 36, width: "100%" }}
          />
        </div>
        <select value={filter} onChange={(e) => setFilter(e.target.value)} style={{ padding: "8px 12px", border: "1px solid #ded8cc", borderRadius: 6, fontSize: 13, backgroundColor: "#fff" }}>
          <option value="">All Statuses</option>
          <option value="available">Available</option>
          <option value="reserved">Reserved</option>
          <option value="borrowed">Borrowed</option>
          <option value="maintenance">Maintenance</option>
          <option value="disabled">Disabled</option>
        </select>
      </div>

      {/* Tools Table */}
      <div style={{ overflowX: "auto" }}>
        <table className="data-table" style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ backgroundColor: "#f7f4ed" }}>
              <th style={{ padding: "10px 12px", textAlign: "left", fontSize: 11, fontWeight: "700", color: "#0b1f33", textTransform: "uppercase" }}>Tool</th>
              <th style={{ padding: "10px 12px", textAlign: "left", fontSize: 11, fontWeight: "700", color: "#0b1f33", textTransform: "uppercase" }}>Owner</th>
              <th style={{ padding: "10px 12px", textAlign: "left", fontSize: 11, fontWeight: "700", color: "#0b1f33", textTransform: "uppercase" }}>Category</th>
              <th style={{ padding: "10px 12px", textAlign: "left", fontSize: 11, fontWeight: "700", color: "#0b1f33", textTransform: "uppercase" }}>Status</th>
              <th style={{ padding: "10px 12px", textAlign: "left", fontSize: 11, fontWeight: "700", color: "#0b1f33", textTransform: "uppercase" }}>Health</th>
              <th style={{ padding: "10px 12px", textAlign: "left", fontSize: 11, fontWeight: "700", color: "#0b1f33", textTransform: "uppercase" }}>Escrow</th>
              <th style={{ padding: "10px 12px", textAlign: "left", fontSize: 11, fontWeight: "700", color: "#0b1f33", textTransform: "uppercase" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} style={{ padding: 40, textAlign: "center", color: "#64748b" }}>Loading tools...</td>
              </tr>
            ) : pageItems.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: 40, textAlign: "center", color: "#64748b" }}>No tools found</td>
              </tr>
            ) : (
              pageItems.map((t) => (
                <tr key={t._id} style={{ borderBottom: "1px solid #f1f5f9", cursor: "pointer" }} onClick={() => openDetail(t)}>
                  <td style={{ padding: "12px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 40, height: 40, borderRadius: 8, backgroundColor: "#f1f5f9", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        {t.images && t.images[0] ? (
                          <img src={t.images[0].url} alt="" style={{ width: 40, height: 40, objectFit: "cover" }} />
                        ) : (
                          <Wrench size={18} color="#94a3b8" />
                        )}
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: "700", color: "#0b1f33" }}>{t.name}</div>
                        <div style={{ fontSize: 10, color: "#94a3b8" }}>{t.condition}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: "12px", fontSize: 12, color: "#475569" }}>{t.owner?.fullName || "Unknown"}</td>
                  <td style={{ padding: "12px" }}>
                    <span style={{ backgroundColor: "#f1f5f9", padding: "3px 8px", borderRadius: 4, fontSize: 11, color: "#475569" }}>
                      {t.category?.name || "Uncategorized"}
                    </span>
                  </td>
                  <td style={{ padding: "12px" }}>
                    <span className={`pill ${t.status}`} style={{ fontSize: 10 }}>{t.status}</span>
                  </td>
                  <td style={{ padding: "12px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <div style={{ width: 50, height: 6, backgroundColor: "#f1f5f9", borderRadius: 3 }}>
                        <div style={{ width: `${t.healthScore || 100}%`, height: 6, backgroundColor: (t.healthScore || 100) > 60 ? "#059669" : (t.healthScore || 100) > 30 ? "#d97706" : "#ef4444", borderRadius: 3 }} />
                      </div>
                      <span style={{ fontSize: 11, color: "#64748b", fontWeight: "600" }}>{t.healthScore || 100}%</span>
                    </div>
                  </td>
                  <td style={{ padding: "12px", fontSize: 12, fontWeight: "700", color: "#0b1f33" }}>{t.depositPoints} pts</td>
                  <td style={{ padding: "12px" }} onClick={(e) => e.stopPropagation()}>
                    <div style={{ display: "flex", gap: 4 }}>
                      <button title="View Details" onClick={() => openDetail(t)} style={{ padding: "6px", backgroundColor: "#f1f5f9", border: "none", borderRadius: 4, cursor: "pointer", color: "#0b1f33" }}>
                        <Eye size={14} />
                      </button>
                      {t.status !== "disabled" && (
                        <button title="Disable" onClick={() => askDisable(t)} style={{ padding: "6px", backgroundColor: "#fef2f2", border: "none", borderRadius: 4, cursor: "pointer", color: "#ef4444" }}>
                          <Ban size={14} />
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
      <div style={{ marginTop: 16, display: "flex", justifyContent: "center", alignItems: "center", gap: 12 }}>
        <button disabled={pageSafe <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} style={{ padding: "8px 16px", border: "1px solid #ded8cc", borderRadius: 6, backgroundColor: "#fff", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
          <ChevronLeft size={14} /> Prev
        </button>
        <span style={{ fontSize: 13, color: "#64748b" }}>Page {pageSafe} of {totalPages}</span>
        <button disabled={pageSafe >= totalPages} onClick={() => setPage((p) => p + 1)} style={{ padding: "8px 16px", border: "1px solid #ded8cc", borderRadius: 6, backgroundColor: "#fff", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
          Next <ChevronRight size={14} />
        </button>
      </div>

      {/* Tool Detail Modal */}
      {detailOpen && selectedTool && (
        <div className="modal-overlay" onClick={() => setDetailOpen(false)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 700, maxHeight: "90vh", overflowY: "auto" }}>
            <div className="modal-header">
              <h3>{editMode ? "Edit Tool" : "Tool Details"}</h3>
              <button className="modal-close-btn" onClick={() => setDetailOpen(false)}><Trash2 size={20} /></button>
            </div>
            <div className="modal-body">
              {/* Tool Image */}
              {selectedTool.images && selectedTool.images[0] && (
                <img
                  src={selectedTool.images[0].url}
                  alt={selectedTool.name}
                  style={{ width: "100%", maxHeight: 250, borderRadius: 10, marginBottom: 16, objectFit: "cover", backgroundColor: "#f1f5f9" }}
                />
              )}

              {/* Info Grid */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
                {[
                  { icon: Wrench, label: "Name", value: selectedTool.name },
                  { icon: User, label: "Owner", value: selectedTool.owner?.fullName || "Unknown" },
                  { icon: Activity, label: "Category", value: selectedTool.category?.name || "Uncategorized" },
                  { icon: Activity, label: "Condition", value: selectedTool.condition || "N/A" },
                  { icon: DollarSign, label: "Escrow", value: `${selectedTool.depositPoints} pts`, color: "#0b1f33", bold: true },
                  { icon: Clock, label: "Max Borrow Days", value: `${selectedTool.maxBorrowDays || 7} days` },
                  { icon: Activity, label: "Health Score", value: `${selectedTool.healthScore || 100}%`, color: (selectedTool.healthScore || 100) > 60 ? "#059669" : "#ef4444", bold: true },
                  { icon: Activity, label: "Status", value: selectedTool.status }
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

              {/* Description */}
              <div style={{ marginBottom: 16, padding: 12, backgroundColor: "#f7f4ed", borderRadius: 8 }}>
                <div style={{ fontSize: 10, color: "#94a3b8", textTransform: "uppercase", fontWeight: "600", marginBottom: 4 }}>Description</div>
                <div style={{ fontSize: 13, color: "#475569" }}>{selectedTool.description || "No description"}</div>
              </div>

              {/* Edit Form */}
              {editMode && (
                <div style={{ marginBottom: 16, padding: 16, backgroundColor: "#f7f4ed", borderRadius: 12 }}>
                  <h4 style={{ margin: "0 0 12px 0", fontSize: 14, color: "#0b1f33" }}>Edit Tool</h4>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div>
                      <label style={{ fontSize: 11, fontWeight: "700", color: "#64748b", display: "block", marginBottom: 4 }}>Name</label>
                      <input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} style={{ padding: "8px 10px", border: "1px solid #ded8cc", borderRadius: 6, fontSize: 13, width: "100%" }} />
                    </div>
                    <div>
                      <label style={{ fontSize: 11, fontWeight: "700", color: "#64748b", display: "block", marginBottom: 4 }}>Condition</label>
                      <select value={editForm.condition} onChange={(e) => setEditForm({ ...editForm, condition: e.target.value })} style={{ padding: "8px 10px", border: "1px solid #ded8cc", borderRadius: 6, fontSize: 13, width: "100%", backgroundColor: "#fff" }}>
                        <option value="">Select</option>
                        <option value="new">New</option>
                        <option value="like_new">Like New</option>
                        <option value="good">Good</option>
                        <option value="fair">Fair</option>
                        <option value="poor">Poor</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: 11, fontWeight: "700", color: "#64748b", display: "block", marginBottom: 4 }}>Escrow Points</label>
                      <input type="number" value={editForm.depositPoints} onChange={(e) => setEditForm({ ...editForm, depositPoints: Number(e.target.value) })} style={{ padding: "8px 10px", border: "1px solid #ded8cc", borderRadius: 6, fontSize: 13, width: "100%" }} />
                    </div>
                    <div>
                      <label style={{ fontSize: 11, fontWeight: "700", color: "#64748b", display: "block", marginBottom: 4 }}>Max Borrow Days</label>
                      <input type="number" value={editForm.maxBorrowDays} onChange={(e) => setEditForm({ ...editForm, maxBorrowDays: Number(e.target.value) })} style={{ padding: "8px 10px", border: "1px solid #ded8cc", borderRadius: 6, fontSize: 13, width: "100%" }} />
                    </div>
                  </div>
                  <div style={{ marginTop: 12 }}>
                    <label style={{ fontSize: 11, fontWeight: "700", color: "#64748b", display: "block", marginBottom: 4 }}>Description</label>
                    <textarea value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} rows={3} style={{ padding: "8px 10px", border: "1px solid #ded8cc", borderRadius: 6, fontSize: 13, width: "100%", resize: "vertical" }} />
                  </div>
                </div>
              )}

              {/* Actions */}
              <div style={{ borderTop: "1px solid #ded8cc", paddingTop: 16, display: "flex", gap: 8, flexWrap: "wrap" }}>
                {editMode ? (
                  <>
                    <button className="primary" onClick={updateTool} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <CheckCircle size={16} /> Save Changes
                    </button>
                    <button className="secondary" onClick={() => setEditMode(false)} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <button className="primary" onClick={() => setEditMode(true)} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <Edit size={16} /> Edit Tool
                    </button>
                    {selectedTool.status !== "disabled" && (
                      <button className="danger" onClick={() => { setDetailOpen(false); askDisable(selectedTool); }} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <Ban size={16} /> Disable Tool
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Disable Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmOpen}
        title="Disable Tool"
        message={`Disable "${pendingTool?.name || 'this tool'}" to prevent borrowing? This can be reversed by the owner.`}
        confirmText="Disable"
        variant="danger"
        onConfirm={() => disable(pendingTool)}
        onCancel={() => { setConfirmOpen(false); setPendingTool(null); }}
      />
    </section>
  );
}