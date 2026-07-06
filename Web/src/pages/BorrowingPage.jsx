import React, { useEffect, useState } from "react";
import { Check, X, Search, ChevronRight, ChevronLeft, Eye, User, Calendar, DollarSign, Activity, Clock, AlertTriangle, ShieldCheck, ShieldOff, Wrench, FileText, Image } from "lucide-react";
import { api } from "../api/client";
import DataTable from "../components/DataTable";
import ConfirmDialog from "../components/ConfirmDialog";
import { useToast } from "../components/Toast";

export default function BorrowingPage() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingRequest, setPendingRequest] = useState(null);
  const [pendingDecision, setPendingDecision] = useState(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [activeTab, setActiveTab] = useState("all");
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const toast = useToast();

  async function load() {
    setLoading(true);
    try {
      const data = await api("/admin/borrow-verifications");
      setRequests(data.requests || []);
    } catch (e) {
      toast.showToast(e.message || "Failed to load borrow requests", "error");
    } finally {
      setLoading(false);
    }
  }

  async function verify(row, decision) {
    try {
      await api(`/admin/borrow-verifications/${row._id}`, {
        method: "PATCH",
        body: JSON.stringify({ decision, note })
      });
      toast.showToast(`Request ${decision}`, "success");
    } catch (e) {
      toast.showToast(e.message || "Failed to verify request", "error");
    } finally {
      setNote("");
      setConfirmOpen(false);
      setPendingRequest(null);
      setPendingDecision(null);
      load();
    }
  }

  async function adminVerifyReturn(row) {
    try {
      await api(`/borrow-requests/${row._id}/verify-return`, { method: "PATCH" });
      toast.showToast("Return verified successfully (Admin Override)", "success");
    } catch (e) {
      toast.showToast(e.message || "Failed to verify return", "error");
    } finally {
      setDetailOpen(false);
      load();
    }
  }

  function openConfirm(row, decision) {
    setPendingRequest(row);
    setPendingDecision(decision);
    setConfirmOpen(true);
  }

  function openDetail(req) {
    setSelectedRequest(req);
    setDetailOpen(true);
  }

  useEffect(() => { load().catch(console.error); }, []);

  // Stats
  const totalRequests = requests.length;
  const pendingReview = requests.filter(r => r.status === "admin_review").length;
  const verified = requests.filter(r => r.status === "verified").length;
  const active = requests.filter(r => ["approved", "picked_up"].includes(r.status)).length;
  const overdue = requests.filter(r => r.status === "overdue").length;
  const completed = requests.filter(r => r.status === "completed").length;

  // Filter
  const filtered = requests.filter((r) => {
    const term = search.toLowerCase();
    const matchesSearch = (r.tool?.name || "").toLowerCase().includes(term) || 
                          (r.borrower?.fullName || "").toLowerCase().includes(term) ||
                          (r.owner?.fullName || "").toLowerCase().includes(term);
    
    if (activeTab === "pending") return matchesSearch && r.status === "admin_review";
    if (activeTab === "verified") return matchesSearch && r.status === "verified";
    if (activeTab === "active") return matchesSearch && ["approved", "picked_up"].includes(r.status);
    if (activeTab === "overdue") return matchesSearch && r.status === "overdue";
    if (activeTab === "completed") return matchesSearch && r.status === "completed";
    if (statusFilter !== "all") return matchesSearch && r.status === statusFilter;
    return matchesSearch;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageSafe = Math.min(page, totalPages);
  const pageItems = filtered.slice((pageSafe - 1) * pageSize, pageSafe * pageSize);

  const tabs = [
    { key: "all", label: `All (${totalRequests})`, icon: FileText },
    { key: "pending", label: `Pending (${pendingReview})`, icon: Clock },
    { key: "verified", label: `Verified (${verified})`, icon: ShieldCheck },
    { key: "active", label: `Active (${active})`, icon: Activity },
    { key: "overdue", label: `Overdue (${overdue})`, icon: AlertTriangle },
    { key: "completed", label: `Completed (${completed})`, icon: Check }
  ];

  return (
    <section>
      {/* Summary Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginBottom: 20 }}>
        <div style={{ backgroundColor: "#f7f4ed", borderRadius: 12, padding: 14 }}>
          <FileText size={18} color="#0b1f33" />
          <div style={{ fontSize: 24, fontWeight: "900", color: "#0b1f33", marginTop: 6 }}>{totalRequests}</div>
          <div style={{ fontSize: 10, color: "#475569", fontWeight: "700", textTransform: "uppercase" }}>Total Requests</div>
        </div>
        <div style={{ backgroundColor: "#fffbeb", borderRadius: 12, padding: 14 }}>
          <Clock size={18} color="#d97706" />
          <div style={{ fontSize: 24, fontWeight: "900", color: "#d97706", marginTop: 6 }}>{pendingReview}</div>
          <div style={{ fontSize: 10, color: "#475569", fontWeight: "700", textTransform: "uppercase" }}>Pending Review</div>
        </div>
        <div style={{ backgroundColor: "#eff6ff", borderRadius: 12, padding: 14 }}>
          <ShieldCheck size={18} color="#3b82f6" />
          <div style={{ fontSize: 24, fontWeight: "900", color: "#3b82f6", marginTop: 6 }}>{verified}</div>
          <div style={{ fontSize: 10, color: "#475569", fontWeight: "700", textTransform: "uppercase" }}>Verified</div>
        </div>
        <div style={{ backgroundColor: "#e8f7ef", borderRadius: 12, padding: 14 }}>
          <Activity size={18} color="#059669" />
          <div style={{ fontSize: 24, fontWeight: "900", color: "#059669", marginTop: 6 }}>{active}</div>
          <div style={{ fontSize: 10, color: "#475569", fontWeight: "700", textTransform: "uppercase" }}>Active</div>
        </div>
        <div style={{ backgroundColor: "#fef2f2", borderRadius: 12, padding: 14 }}>
          <AlertTriangle size={18} color="#ef4444" />
          <div style={{ fontSize: 24, fontWeight: "900", color: "#ef4444", marginTop: 6 }}>{overdue}</div>
          <div style={{ fontSize: 10, color: "#475569", fontWeight: "700", textTransform: "uppercase" }}>Overdue</div>
        </div>
        <div style={{ backgroundColor: "#e8f7ef", borderRadius: 12, padding: 14 }}>
          <Check size={18} color="#059669" />
          <div style={{ fontSize: 24, fontWeight: "900", color: "#059669", marginTop: 6 }}>{completed}</div>
          <div style={{ fontSize: 10, color: "#475569", fontWeight: "700", textTransform: "uppercase" }}>Completed</div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 16, flexWrap: "wrap" }}>
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => { setActiveTab(tab.key); setPage(1); }}
            style={{
              padding: "8px 14px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 12, fontWeight: "700",
              backgroundColor: activeTab === tab.key ? "#0b1f33" : "#f1f5f9",
              color: activeTab === tab.key ? "#fff" : "#64748b",
              display: "flex", alignItems: "center", gap: 6
            }}
          >
            <tab.icon size={14} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search & Filters */}
      <div className="toolbar" style={{ marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
        <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
          <Search size={16} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
          <input
            placeholder="Search by tool, borrower, or owner..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            style={{ paddingLeft: 36, width: "100%" }}
          />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ padding: "8px 12px", border: "1px solid #ded8cc", borderRadius: 6, fontSize: 13, backgroundColor: "#fff" }}>
          <option value="all">All Statuses</option>
          <option value="admin_review">Admin Review</option>
          <option value="verified">Verified</option>
          <option value="approved">Approved</option>
          <option value="picked_up">Picked Up</option>
          <option value="returned">Returned</option>
          <option value="completed">Completed</option>
          <option value="overdue">Overdue</option>
          <option value="rejected">Rejected</option>
          <option value="disputed">Disputed</option>
        </select>
        <div style={{ display: "flex", gap: 4 }}>
          <input
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Verification note..."
            style={{ padding: "8px 12px", border: "1px solid #ded8cc", borderRadius: 6, fontSize: 13, minWidth: 180 }}
          />
          <button onClick={load} style={{ padding: "8px 16px", backgroundColor: "#0b1f33", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 12, fontWeight: "700" }}>
            Refresh
          </button>
        </div>
      </div>

      {/* Borrow Requests Table */}
      <div style={{ overflowX: "auto" }}>
        <table className="data-table" style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ backgroundColor: "#f7f4ed" }}>
              <th style={{ padding: "10px 12px", textAlign: "left", fontSize: 11, fontWeight: "700", color: "#0b1f33", textTransform: "uppercase" }}>Tool</th>
              <th style={{ padding: "10px 12px", textAlign: "left", fontSize: 11, fontWeight: "700", color: "#0b1f33", textTransform: "uppercase" }}>Borrower</th>
              <th style={{ padding: "10px 12px", textAlign: "left", fontSize: 11, fontWeight: "700", color: "#0b1f33", textTransform: "uppercase" }}>Owner</th>
              <th style={{ padding: "10px 12px", textAlign: "left", fontSize: 11, fontWeight: "700", color: "#0b1f33", textTransform: "uppercase" }}>Status</th>
              <th style={{ padding: "10px 12px", textAlign: "left", fontSize: 11, fontWeight: "700", color: "#0b1f33", textTransform: "uppercase" }}>Escrow</th>
              <th style={{ padding: "10px 12px", textAlign: "left", fontSize: 11, fontWeight: "700", color: "#0b1f33", textTransform: "uppercase" }}>Priority</th>
              <th style={{ padding: "10px 12px", textAlign: "left", fontSize: 11, fontWeight: "700", color: "#0b1f33", textTransform: "uppercase" }}>Dates</th>
              <th style={{ padding: "10px 12px", textAlign: "left", fontSize: 11, fontWeight: "700", color: "#0b1f33", textTransform: "uppercase" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} style={{ padding: 40, textAlign: "center", color: "#64748b" }}>Loading borrow requests...</td>
              </tr>
            ) : pageItems.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ padding: 40, textAlign: "center", color: "#64748b" }}>No borrow requests found</td>
              </tr>
            ) : (
              pageItems.map((r, i) => (
                <tr key={r._id || i} style={{ borderBottom: "1px solid #f1f5f9", cursor: "pointer" }} onClick={() => openDetail(r)}>
                  <td style={{ padding: "12px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <Wrench size={16} color="#64748b" />
                      </div>
                      <span style={{ fontSize: 13, fontWeight: "700", color: "#0b1f33" }}>{r.tool?.name || "Unknown"}</span>
                    </div>
                  </td>
                  <td style={{ padding: "12px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <div style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: "#0b1f33", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <span style={{ color: "#fff", fontSize: 10, fontWeight: "700" }}>{(r.borrower?.fullName || "U").charAt(0).toUpperCase()}</span>
                      </div>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: "600", color: "#0b1f33" }}>{r.borrower?.fullName || "Unknown"}</div>
                        <div style={{ fontSize: 10, color: "#94a3b8" }}>{r.borrower?.trustPoints || 0} pts</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: "12px", fontSize: 12, color: "#475569" }}>{r.owner?.fullName || "Unknown"}</td>
                  <td style={{ padding: "12px" }}>
                    <span className={`pill ${r.status}`} style={{ fontSize: 10 }}>{r.status}</span>
                  </td>
                  <td style={{ padding: "12px", fontWeight: "700", fontSize: 12, color: "#0b1f33" }}>{r.escrowPoints} pts</td>
                  <td style={{ padding: "12px", fontSize: 12, color: "#64748b" }}>{r.priorityScore}</td>
                  <td style={{ padding: "12px", fontSize: 11, color: "#64748b" }}>
                    {r.startDate ? new Date(r.startDate).toLocaleDateString() : "N/A"}
                    {r.endDate ? ` → ${new Date(r.endDate).toLocaleDateString()}` : ""}
                  </td>
                  <td style={{ padding: "12px" }} onClick={(e) => e.stopPropagation()}>
                    <div style={{ display: "flex", gap: 4 }}>
                      <button title="View Details" onClick={() => openDetail(r)} style={{ padding: "6px", backgroundColor: "#f1f5f9", border: "none", borderRadius: 4, cursor: "pointer", color: "#0b1f33" }}>
                        <Eye size={14} />
                      </button>
                      {r.status === "admin_review" && (
                        <>
                          <button title="Verify" onClick={() => openConfirm(r, "verified")} style={{ padding: "6px", backgroundColor: "#e8f7ef", border: "none", borderRadius: 4, cursor: "pointer", color: "#059669" }}>
                            <Check size={14} />
                          </button>
                          <button title="Reject" onClick={() => openConfirm(r, "rejected")} style={{ padding: "6px", backgroundColor: "#fef2f2", border: "none", borderRadius: 4, cursor: "pointer", color: "#ef4444" }}>
                            <X size={14} />
                          </button>
                        </>
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

      {/* Borrow Detail Modal */}
      {detailOpen && selectedRequest && (
        <div className="modal-overlay" onClick={() => setDetailOpen(false)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 700, maxHeight: "90vh", overflowY: "auto" }}>
            <div className="modal-header">
              <h3>Borrow Request Details</h3>
              <button className="modal-close-btn" onClick={() => setDetailOpen(false)}><X size={20} /></button>
            </div>
            <div className="modal-body">
              {/* Header */}
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20, padding: 16, backgroundColor: "#f7f4ed", borderRadius: 12 }}>
                <div style={{ width: 48, height: 48, borderRadius: 12, backgroundColor: "#0b1f33", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Wrench size={24} color="#fff" />
                </div>
                <div style={{ flex: 1 }}>
                  <h2 style={{ margin: 0, fontSize: 18, color: "#0b1f33" }}>{selectedRequest.tool?.name || "Unknown Tool"}</h2>
                  <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
                    <span className={`pill ${selectedRequest.status}`} style={{ fontSize: 10 }}>{selectedRequest.status}</span>
                    <span style={{ fontSize: 11, color: "#64748b" }}>Priority: {selectedRequest.priorityScore}</span>
                  </div>
                </div>
              </div>

              {/* Info Grid */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
                {[
                  { icon: User, label: "Borrower", value: selectedRequest.borrower?.fullName || "Unknown" },
                  { icon: User, label: "Owner", value: selectedRequest.owner?.fullName || "Unknown" },
                  { icon: DollarSign, label: "Escrow", value: `${selectedRequest.escrowPoints} pts`, color: "#0b1f33", bold: true },
                  { icon: Activity, label: "Priority Score", value: selectedRequest.priorityScore },
                  { icon: Calendar, label: "Start Date", value: selectedRequest.startDate ? new Date(selectedRequest.startDate).toLocaleDateString() : "N/A" },
                  { icon: Calendar, label: "End Date", value: selectedRequest.endDate ? new Date(selectedRequest.endDate).toLocaleDateString() : "N/A" },
                  { icon: Clock, label: "Created", value: selectedRequest.createdAt ? new Date(selectedRequest.createdAt).toLocaleDateString() : "N/A" },
                  { icon: Clock, label: "Returned", value: selectedRequest.returnedAt ? new Date(selectedRequest.returnedAt).toLocaleDateString() : "Not yet" }
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

              {/* ID & Evidence */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
                <div style={{ padding: 12, backgroundColor: "#f7f4ed", borderRadius: 8 }}>
                  <div style={{ fontSize: 10, color: "#94a3b8", textTransform: "uppercase", fontWeight: "600", marginBottom: 6 }}>Borrower ID</div>
                  {selectedRequest.borrower?.idImageUrl ? (
                    <div>
                      <img src={selectedRequest.borrower.idImageUrl} alt="Borrower ID" style={{ maxWidth: "100%", maxHeight: 150, borderRadius: 6, marginBottom: 6 }} />
                      <a href={selectedRequest.borrower.idImageUrl} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: "#3b82f6", display: "flex", alignItems: "center", gap: 4 }}>
                        <Eye size={14} /> View Full ID
                      </a>
                    </div>
                  ) : (
                    <span style={{ fontSize: 12, color: "#94a3b8" }}>No ID uploaded</span>
                  )}
                </div>
                <div style={{ padding: 12, backgroundColor: "#f7f4ed", borderRadius: 8 }}>
                  <div style={{ fontSize: 10, color: "#94a3b8", textTransform: "uppercase", fontWeight: "600", marginBottom: 6 }}>Initial Request Evidence</div>
                  {selectedRequest.initialEvidenceMedia?.url || selectedRequest.initialEvidenceUrl ? (
                    <div>
                      <img src={selectedRequest.initialEvidenceMedia?.url || selectedRequest.initialEvidenceUrl} alt="Evidence" style={{ maxWidth: "100%", maxHeight: 150, borderRadius: 6, marginBottom: 6 }} />
                      <a href={selectedRequest.initialEvidenceMedia?.url || selectedRequest.initialEvidenceUrl} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: "#3b82f6", display: "flex", alignItems: "center", gap: 4 }}>
                        <Eye size={14} /> View Full Evidence
                      </a>
                    </div>
                  ) : (
                    <span style={{ fontSize: 12, color: "#94a3b8" }}>No evidence</span>
                  )}
                </div>
              </div>

              {/* Pickup & Return Checklists */}
              {(selectedRequest.pickupChecklist?.photoEvidenceUrl || selectedRequest.returnChecklist?.photoEvidenceUrl) && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
                  <div style={{ padding: 12, backgroundColor: "#eff6ff", borderRadius: 8, border: "1px solid #bfdbfe" }}>
                    <div style={{ fontSize: 10, color: "#1e3a8a", textTransform: "uppercase", fontWeight: "700", marginBottom: 6 }}>Pickup Evidence</div>
                    {selectedRequest.pickupChecklist?.photoEvidenceUrl ? (
                      <div>
                        <img src={selectedRequest.pickupChecklist.photoEvidenceUrl} alt="Pickup" style={{ maxWidth: "100%", maxHeight: 150, borderRadius: 6, marginBottom: 6 }} />
                        <a href={selectedRequest.pickupChecklist.photoEvidenceUrl} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: "#3b82f6", display: "flex", alignItems: "center", gap: 4 }}>
                          <Eye size={14} /> View Full Image
                        </a>
                      </div>
                    ) : (
                      <span style={{ fontSize: 12, color: "#94a3b8" }}>No pickup photo provided</span>
                    )}
                  </div>
                  <div style={{ padding: 12, backgroundColor: "#e8f7ef", borderRadius: 8, border: "1px solid #a7f3d0" }}>
                    <div style={{ fontSize: 10, color: "#065f46", textTransform: "uppercase", fontWeight: "700", marginBottom: 6 }}>Return Evidence</div>
                    {selectedRequest.returnChecklist?.photoEvidenceUrl ? (
                      <div>
                        <img src={selectedRequest.returnChecklist.photoEvidenceUrl} alt="Return" style={{ maxWidth: "100%", maxHeight: 150, borderRadius: 6, marginBottom: 6 }} />
                        <div style={{ fontSize: 12, color: "#065f46", marginBottom: 4 }}>
                          Condition: <strong>{selectedRequest.returnChecklist.condition || "Not specified"}</strong>
                        </div>
                        {selectedRequest.returnChecklist.notes && (
                          <div style={{ fontSize: 12, color: "#475569", marginBottom: 6, fontStyle: "italic" }}>
                            "{selectedRequest.returnChecklist.notes}"
                          </div>
                        )}
                        <a href={selectedRequest.returnChecklist.photoEvidenceUrl} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: "#3b82f6", display: "flex", alignItems: "center", gap: 4 }}>
                          <Eye size={14} /> View Full Image
                        </a>
                      </div>
                    ) : (
                      <span style={{ fontSize: 12, color: "#94a3b8" }}>No return photo provided</span>
                    )}
                  </div>
                </div>
              )}

              {/* Request Note */}
              {selectedRequest.requestNote && (
                <div style={{ marginBottom: 16, padding: 12, backgroundColor: "#f7f4ed", borderRadius: 8 }}>
                  <div style={{ fontSize: 10, color: "#94a3b8", textTransform: "uppercase", fontWeight: "600", marginBottom: 4 }}>Request Note</div>
                  <div style={{ fontSize: 13, color: "#475569" }}>{selectedRequest.requestNote}</div>
                </div>
              )}

              {/* Admin Verification */}
              {selectedRequest.adminVerification && (
                <div style={{ marginBottom: 16, padding: 12, backgroundColor: "#fffbeb", borderRadius: 8, border: "1px solid #fcd34d" }}>
                  <div style={{ fontSize: 10, color: "#d97706", textTransform: "uppercase", fontWeight: "700", marginBottom: 4 }}>Admin Verification</div>
                  <div style={{ fontSize: 12, color: "#475569" }}>
                    Status: <strong>{selectedRequest.adminVerification.status}</strong>
                    {selectedRequest.adminVerification.note && <> — Note: {selectedRequest.adminVerification.note}</>}
                  </div>
                </div>
              )}

              {/* Actions */}
              {selectedRequest.status === "admin_review" && (
                <div style={{ borderTop: "1px solid #ded8cc", paddingTop: 16, display: "flex", gap: 8 }}>
                  <button className="primary" onClick={() => { setDetailOpen(false); openConfirm(selectedRequest, "verified"); }} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <Check size={16} /> Verify Request
                  </button>
                  <button className="danger" onClick={() => { setDetailOpen(false); openConfirm(selectedRequest, "rejected"); }} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <X size={16} /> Reject Request
                  </button>
                </div>
              )}
              
              {selectedRequest.status === "returned" && (
                <div style={{ borderTop: "1px solid #ded8cc", paddingTop: 16, display: "flex", gap: 8 }}>
                  <button className="primary" onClick={() => { adminVerifyReturn(selectedRequest); }} style={{ display: "flex", alignItems: "center", gap: 6, backgroundColor: "#065f46" }}>
                    <ShieldCheck size={16} /> Verify Return (Admin Override)
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmOpen}
        title={`${pendingDecision === "verified" ? "Verify" : "Reject"} Borrow Request`}
        message={`${pendingDecision === "verified" ? "Verify" : "Reject"} request for ${pendingRequest?.tool?.name || 'this tool'} by ${pendingRequest?.borrower?.fullName || 'borrower'}?`}
        confirmText={pendingDecision === "verified" ? "Verify" : "Reject"}
        variant={pendingDecision === "rejected" ? "danger" : "info"}
        onConfirm={() => verify(pendingRequest, pendingDecision)}
        onCancel={() => { setConfirmOpen(false); setPendingRequest(null); setPendingDecision(null); }}
      />
    </section>
  );
}