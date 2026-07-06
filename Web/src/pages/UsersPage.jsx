import React, { useEffect, useState } from "react";
import { Check, Pause, X, Eye, ShieldCheck, ShieldOff, Image as ImageIcon, Search, Trash2, Mail, Phone, MapPin, Calendar, Award, ArrowUp, ArrowDown, Activity, UserCheck, UserX, AlertTriangle, ChevronLeft, ChevronRight } from "lucide-react";
import { api } from "../api/client";
import DataTable from "../components/DataTable";
import ConfirmDialog from "../components/ConfirmDialog";
import { useToast } from "../components/Toast";

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingTarget, setPendingTarget] = useState(null);
  const [pendingStatus, setPendingStatus] = useState(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selectedUser, setSelectedUser] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [userBorrows, setUserBorrows] = useState([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const pageSize = 10;
  const toast = useToast();

  async function load() {
    setLoading(true);
    try {
      const data = await api("/admin/users");
      setUsers(data.users || []);
    } catch (e) {
      toast.showToast(e.message || "Failed to load users", "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load().catch(() => {}); }, []);

  async function setStatus(user, status) {
    try {
      await api(`/admin/users/${user._id}/status`, { method: "PATCH", body: JSON.stringify({ status }) });
      toast.showToast(`User ${status === 'approved' ? 'approved' : status}`, "success");
    } catch (e) {
      toast.showToast(e.message || "Failed to update status", "error");
    } finally {
      setConfirmOpen(false);
      setPendingTarget(null);
      setPendingStatus(null);
      load();
    }
  }

  async function deleteUser(user) {
    try {
      await api(`/admin/users/${user._id}`, { method: "DELETE" });
      toast.showToast("User deleted", "success");
      load();
    } catch (e) {
      toast.showToast(e.message || "Failed to delete user", "error");
    } finally {
      setConfirmOpen(false);
      setPendingTarget(null);
    }
  }

  async function approveId(user) {
    try {
      await api(`/admin/users/${user._id}/verify-id`, {
        method: "PATCH",
        body: JSON.stringify({ decision: "approve", reason: "ID verified by admin" })
      });
      toast.showToast("ID approved", "success");
      if (detailOpen) {
        setSelectedUser({ ...selectedUser, idVerified: true, status: "approved" });
      }
      load();
    } catch (e) {
      toast.showToast(e.message || "Failed to verify ID", "error");
    }
  }

  async function rejectId(user, reason) {
    try {
      await api(`/admin/users/${user._id}/verify-id`, {
        method: "PATCH",
        body: JSON.stringify({ decision: "reject", reason: reason || "Photo unclear, please re-submit" })
      });
      toast.showToast("ID rejected", "error");
      if (detailOpen) {
        setSelectedUser({ ...selectedUser, idVerified: false, status: "rejected" });
      }
      load();
    } catch (e) {
      toast.showToast(e.message || "Failed to reject ID", "error");
    }
  }

  function openConfirm(user, status) {
    setPendingTarget(user);
    setPendingStatus(status);
    setConfirmOpen(true);
  }

  function openDeleteConfirm(user) {
    setPendingTarget(user);
    setPendingStatus("delete");
    setConfirmOpen(true);
  }

  async function openDetail(user) {
    setSelectedUser(user);
    setDetailOpen(true);
    try {
      const data = await api(`/admin/borrow-requests?user=${user._id}`).catch(() => ({ requests: [] }));
      setUserBorrows(data.requests || []);
    } catch (e) {
      setUserBorrows([]);
    }
  }

  // Filter users
  const filtered = users.filter((u) => {
    const term = search.toLowerCase();
    const matchesSearch = (u.fullName || "").toLowerCase().includes(term) || 
                          (u.email || "").toLowerCase().includes(term) ||
                          (u.phone || "").toLowerCase().includes(term);
    
    if (statusFilter === "pending") return matchesSearch && u.status === "pending";
    if (statusFilter === "approved") return matchesSearch && u.status === "approved";
    if (statusFilter === "suspended") return matchesSearch && u.status === "suspended";
    if (statusFilter === "rejected") return matchesSearch && u.status === "rejected";
    if (statusFilter === "id_pending") return matchesSearch && u.idImageUrl && !u.idVerified;
    if (statusFilter === "id_verified") return matchesSearch && u.idVerified;
    return matchesSearch;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageSafe = Math.min(page, totalPages);
  const pageItems = filtered.slice((pageSafe - 1) * pageSize, pageSafe * pageSize);

  // Stats
  const totalUsers = users.length;
  const pendingUsers = users.filter(u => u.status === "pending").length;
  const idPending = users.filter(u => u.idImageUrl && !u.idVerified).length;

  return (
    <section>
      {/* Summary Cards */}
      <div className="stats-grid" style={{ marginBottom: 20 }}>
        <div className="stat-card">
          <div className="stat-value">{totalUsers}</div>
          <div className="stat-label">Total Residents</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: "#f59e0b" }}>{pendingUsers}</div>
          <div className="stat-label">Pending Approval</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: "#3b82f6" }}>{idPending}</div>
          <div className="stat-label">ID Pending Review</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: "#059669" }}>{users.filter(u => u.idVerified).length}</div>
          <div className="stat-label">ID Verified</div>
        </div>
      </div>

      {/* Filters */}
      <div className="toolbar" style={{ marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
        <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
          <Search size={16} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
          <input
            placeholder="Search by name, email, or phone..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            style={{ paddingLeft: 36, width: "100%" }}
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          style={{ padding: "8px 12px", border: "1px solid #ded8cc", borderRadius: 6, fontSize: 13, backgroundColor: "#fff" }}
        >
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="suspended">Suspended</option>
          <option value="rejected">Rejected</option>
          <option value="id_pending">ID Pending Review</option>
          <option value="id_verified">ID Verified</option>
        </select>
      </div>

      {/* Users Table */}
      <div style={{ overflowX: "auto" }}>
        <table className="data-table" style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ backgroundColor: "#f7f4ed" }}>
              <th style={{ padding: "10px 12px", textAlign: "left", fontSize: 12, fontWeight: "700", color: "#0b1f33", textTransform: "uppercase" }}>Resident</th>
              <th style={{ padding: "10px 12px", textAlign: "left", fontSize: 12, fontWeight: "700", color: "#0b1f33", textTransform: "uppercase" }}>Email</th>
              <th style={{ padding: "10px 12px", textAlign: "left", fontSize: 12, fontWeight: "700", color: "#0b1f33", textTransform: "uppercase" }}>Status</th>
              <th style={{ padding: "10px 12px", textAlign: "left", fontSize: 12, fontWeight: "700", color: "#0b1f33", textTransform: "uppercase" }}>ID Status</th>
              <th style={{ padding: "10px 12px", textAlign: "left", fontSize: 12, fontWeight: "700", color: "#0b1f33", textTransform: "uppercase" }}>Trust</th>
              <th style={{ padding: "10px 12px", textAlign: "left", fontSize: 12, fontWeight: "700", color: "#0b1f33", textTransform: "uppercase" }}>Joined</th>
              <th style={{ padding: "10px 12px", textAlign: "left", fontSize: 12, fontWeight: "700", color: "#0b1f33", textTransform: "uppercase" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} style={{ padding: 40, textAlign: "center", color: "#64748b" }}>Loading users...</td>
              </tr>
            ) : pageItems.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: 40, textAlign: "center", color: "#64748b" }}>No users found</td>
              </tr>
            ) : (
              pageItems.map((u) => (
                <tr key={u._id} style={{ borderBottom: "1px solid #f1f5f9", cursor: "pointer" }} onClick={() => openDetail(u)}>
                  <td style={{ padding: "12px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: u.avatarUrl ? "transparent" : "#0b1f33", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                        {u.avatarUrl ? (
                          <img src={u.avatarUrl} alt="" style={{ width: 36, height: 36, borderRadius: 18, objectFit: "cover" }} />
                        ) : (
                          <span style={{ color: "#fff", fontSize: 14, fontWeight: "700" }}>{(u.fullName || "U").charAt(0).toUpperCase()}</span>
                        )}
                      </div>
                      <div>
                        <div style={{ fontWeight: "700", fontSize: 13, color: "#0b1f33" }}>{u.fullName}</div>
                        {u.phone && <div style={{ fontSize: 11, color: "#94a3b8" }}>{u.phone}</div>}
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: "12px", fontSize: 12, color: "#475569" }}>{u.email}</td>
                  <td style={{ padding: "12px" }}>
                    <span className={`pill ${u.status}`} style={{ fontSize: 10 }}>{u.status}</span>
                  </td>
                  <td style={{ padding: "12px" }}>
                    {u.idVerified ? (
                      <span className="pill approved" style={{ fontSize: 10, backgroundColor: "#e8f7ef", color: "#059669" }}>
                        <ShieldCheck size={12} /> Verified
                      </span>
                    ) : u.idImageUrl ? (
                      <span className="pill pending" style={{ fontSize: 10, backgroundColor: "#fffbeb", color: "#d97706" }}>
                        <Eye size={12} /> Pending
                      </span>
                    ) : (
                      <span className="pill" style={{ fontSize: 10, backgroundColor: "#f1f5f9", color: "#94a3b8" }}>None</span>
                    )}
                  </td>
                  <td style={{ padding: "12px", fontWeight: "700", fontSize: 13, color: "#0b1f33" }}>{u.trustPoints}</td>
                  <td style={{ padding: "12px", fontSize: 11, color: "#64748b" }}>{u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "N/A"}</td>
                  <td style={{ padding: "12px" }} onClick={(e) => e.stopPropagation()}>
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                      {u.idImageUrl && !u.idVerified && (
                        <button
                          title="Approve ID"
                          onClick={() => approveId(u)}
                          style={{ padding: "6px", backgroundColor: "#e8f7ef", border: "none", borderRadius: 4, cursor: "pointer", color: "#059669" }}
                        >
                          <ShieldCheck size={14} />
                        </button>
                      )}
                      {u.idImageUrl && !u.idVerified && (
                        <button
                          title="Reject ID"
                          onClick={() => rejectId(u, "Photo unclear, please re-submit")}
                          style={{ padding: "6px", backgroundColor: "#fef2f2", border: "none", borderRadius: 4, cursor: "pointer", color: "#ef4444" }}
                        >
                          <ShieldOff size={14} />
                        </button>
                      )}
                      {u.status !== "approved" && (
                        <button title="Approve" onClick={() => openConfirm(u, "approved")} style={{ padding: "6px", backgroundColor: "#e8f7ef", border: "none", borderRadius: 4, cursor: "pointer", color: "#059669" }}>
                          <Check size={14} />
                        </button>
                      )}
                      {u.status !== "suspended" && (
                        <button title="Suspend" onClick={() => openConfirm(u, "suspended")} style={{ padding: "6px", backgroundColor: "#fffbeb", border: "none", borderRadius: 4, cursor: "pointer", color: "#d97706" }}>
                          <Pause size={14} />
                        </button>
                      )}
                      {u.status !== "rejected" && (
                        <button title="Reject" onClick={() => openConfirm(u, "rejected")} style={{ padding: "6px", backgroundColor: "#fef2f2", border: "none", borderRadius: 4, cursor: "pointer", color: "#ef4444" }}>
                          <X size={14} />
                        </button>
                      )}
                      <button
                        title="Delete"
                        onClick={() => openDeleteConfirm(u)}
                        style={{ padding: "6px", backgroundColor: "#f1f5f9", border: "none", borderRadius: 4, cursor: "pointer", color: "#64748b" }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="pagination" style={{ marginTop: 16, display: "flex", justifyContent: "center", alignItems: "center", gap: 12 }}>
        <button disabled={pageSafe <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} style={{ padding: "8px 16px", border: "1px solid #ded8cc", borderRadius: 6, backgroundColor: "#fff", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
          <ChevronLeft size={14} /> Prev
        </button>
        <span style={{ fontSize: 13, color: "#64748b" }}>Page {pageSafe} of {totalPages}</span>
        <button disabled={pageSafe >= totalPages} onClick={() => setPage((p) => p + 1)} style={{ padding: "8px 16px", border: "1px solid #ded8cc", borderRadius: 6, backgroundColor: "#fff", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
          Next <ChevronRight size={14} />
        </button>
      </div>

      {/* User Detail Modal */}
      {detailOpen && selectedUser && (
        <div className="modal-overlay" onClick={() => setDetailOpen(false)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 700, maxHeight: "90vh", overflowY: "auto" }}>
            <div className="modal-header">
              <h3>User Details</h3>
              <button className="modal-close-btn" onClick={() => setDetailOpen(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              {/* Profile Header */}
              <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20, padding: 16, backgroundColor: "#f7f4ed", borderRadius: 12 }}>
                <div style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: selectedUser.avatarUrl ? "transparent" : "#0b1f33", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {selectedUser.avatarUrl ? (
                    <img src={selectedUser.avatarUrl} alt="" style={{ width: 64, height: 64, borderRadius: 32, objectFit: "cover" }} />
                  ) : (
                    <span style={{ color: "#fff", fontSize: 24, fontWeight: "700" }}>{(selectedUser.fullName || "U").charAt(0).toUpperCase()}</span>
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <h2 style={{ margin: 0, fontSize: 18, color: "#0b1f33" }}>{selectedUser.fullName}</h2>
                  <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                    <span className={`pill ${selectedUser.status}`} style={{ fontSize: 10 }}>{selectedUser.status}</span>
                    {selectedUser.idVerified ? (
                      <span className="pill approved" style={{ fontSize: 10, backgroundColor: "#e8f7ef", color: "#059669" }}>ID Verified</span>
                    ) : selectedUser.idImageUrl ? (
                      <span className="pill pending" style={{ fontSize: 10, backgroundColor: "#fffbeb", color: "#d97706" }}>ID Pending</span>
                    ) : null}
                    {selectedUser.role === "admin" && <span className="pill" style={{ backgroundColor: "#0b1f33", color: "#fff", fontSize: 10 }}>Admin</span>}
                  </div>
                </div>
              </div>

              {/* Info Grid */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
                {[
                  { icon: Mail, label: "Email", value: selectedUser.email },
                  { icon: Phone, label: "Phone", value: selectedUser.phone || "Not provided" },
                  { icon: MapPin, label: "Address", value: selectedUser.address || "Not provided" },
                  { icon: Calendar, label: "Joined", value: selectedUser.createdAt ? new Date(selectedUser.createdAt).toLocaleDateString() : "N/A" },
                  { icon: Award, label: "Trust Points", value: selectedUser.trustPoints, color: "#0b1f33", bold: true },
                  { icon: Activity, label: "Community", value: selectedUser.community?.name || "N/A" }
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

              {/* ID Verification Section */}
              {selectedUser.idImageUrl && (
                <div style={{ marginBottom: 20, padding: 16, backgroundColor: "#f7f4ed", borderRadius: 12 }}>
                  <h4 style={{ margin: "0 0 12px 0", fontSize: 14, color: "#0b1f33" }}>ID Verification</h4>
                  <img
                    src={selectedUser.idImageUrl}
                    alt="User ID"
                    style={{ maxWidth: "100%", maxHeight: 300, borderRadius: 8, marginBottom: 12, border: "1px solid #ded8cc" }}
                  />
                  <div style={{ display: "flex", gap: 8 }}>
                    {!selectedUser.idVerified && (
                      <>
                        <button className="primary" onClick={() => approveId(selectedUser)} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <Check size={16} /> Approve ID
                        </button>
                        <button className="danger" onClick={() => rejectId(selectedUser, "Photo unclear")} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <X size={16} /> Reject ID
                        </button>
                      </>
                    )}
                    {selectedUser.idVerified && (
                      <span className="pill approved" style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}>
                        <ShieldCheck size={16} /> ID Approved
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Borrow History */}
              <div style={{ marginBottom: 20 }}>
                <h4 style={{ margin: "0 0 12px 0", fontSize: 14, color: "#0b1f33" }}>Borrowing History ({userBorrows.length})</h4>
                {userBorrows.length === 0 ? (
                  <p style={{ fontSize: 12, color: "#94a3b8" }}>No borrowing history for this user.</p>
                ) : (
                  <div style={{ maxHeight: 200, overflowY: "auto" }}>
                    {userBorrows.map((b, i) => (
                      <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid #f1f5f9" }}>
                        <div>
                          <span style={{ fontSize: 12, fontWeight: "600", color: "#0b1f33" }}>{b.tool?.name || "Unknown"}</span>
                          <span style={{ fontSize: 11, color: "#94a3b8", marginLeft: 8 }}>{new Date(b.startDate || b.createdAt).toLocaleDateString()}</span>
                        </div>
                        <span className={`pill ${b.status}`} style={{ fontSize: 9 }}>{b.status}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Quick Actions */}
              <div style={{ borderTop: "1px solid #ded8cc", paddingTop: 16 }}>
                <h4 style={{ margin: "0 0 12px 0", fontSize: 14, color: "#0b1f33" }}>Quick Actions</h4>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {selectedUser.status !== "approved" && (
                    <button className="primary" onClick={() => { setDetailOpen(false); openConfirm(selectedUser, "approved"); }} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <Check size={16} /> Approve
                    </button>
                  )}
                  {selectedUser.status !== "suspended" && (
                    <button className="secondary" onClick={() => { setDetailOpen(false); openConfirm(selectedUser, "suspended"); }} style={{ display: "flex", alignItems: "center", gap: 6, borderColor: "#d97706", color: "#d97706" }}>
                      <Pause size={16} /> Suspend
                    </button>
                  )}
                  {selectedUser.status !== "rejected" && (
                    <button className="danger" onClick={() => { setDetailOpen(false); openConfirm(selectedUser, "rejected"); }} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <X size={16} /> Reject
                    </button>
                  )}
                  <button style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", border: "1px solid #ef4444", borderRadius: 6, backgroundColor: "#fef2f2", color: "#ef4444", cursor: "pointer", fontSize: 13, fontWeight: "600" }}
                    onClick={() => { setDetailOpen(false); openDeleteConfirm(selectedUser); }}>
                    <Trash2 size={16} /> Delete User
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Status Change Confirm Dialog */}
      {confirmOpen && pendingStatus !== "delete" && (
        <ConfirmDialog
          isOpen={confirmOpen}
          title={`Update User Status`}
          message={`Change status for ${pendingTarget?.fullName || 'this user'} to "${pendingStatus}"?`}
          confirmText={pendingStatus === "rejected" ? "Reject" : pendingStatus === "suspended" ? "Suspend" : "Approve"}
          variant={pendingStatus === "suspended" || pendingStatus === "rejected" ? "danger" : "info"}
          onConfirm={() => setStatus(pendingTarget, pendingStatus)}
          onCancel={() => { setConfirmOpen(false); setPendingTarget(null); setPendingStatus(null); }}
        />
      )}

      {/* Delete Confirm Dialog */}
      {confirmOpen && pendingStatus === "delete" && (
        <ConfirmDialog
          isOpen={confirmOpen}
          title="Delete User"
          message={`Permanently delete ${pendingTarget?.fullName || 'this user'}? This cannot be undone.`}
          confirmText="Delete"
          variant="danger"
          onConfirm={() => deleteUser(pendingTarget)}
          onCancel={() => { setConfirmOpen(false); setPendingTarget(null); setPendingStatus(null); }}
        />
      )}
    </section>
  );
}