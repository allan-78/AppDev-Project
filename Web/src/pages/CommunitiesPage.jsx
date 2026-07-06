import React, { useEffect, useState } from "react";
import { Check, X, ExternalLink, Search, ChevronRight, ChevronLeft, Users, MapPin, Hash, Eye, ShieldCheck, ShieldOff, Activity, MessageSquare, Calendar, User, Home, FileText } from "lucide-react";
import { api } from "../api/client";
import DataTable from "../components/DataTable";
import ConfirmDialog from "../components/ConfirmDialog";
import { useToast } from "../components/Toast";

function MediaLink({ media, url }) {
  const href = media?.url || url;
  if (!href) return <span style={{ color: "#94a3b8", fontSize: 12 }}>No media</span>;
  return (
    <a className="media-link" href={href} target="_blank" rel="noreferrer" style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "#3b82f6" }}>
      <Eye size={14} /> View ID
    </a>
  );
}

export default function CommunitiesPage() {
  const [data, setData] = useState({ communities: [], creationRequests: [], joinRequests: [], posts: [] });
  const [note, setNote] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingTarget, setPendingTarget] = useState(null);
  const [pendingDecision, setPendingDecision] = useState(null);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedCommunity, setSelectedCommunity] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const toast = useToast();

  async function load() {
    try {
      const result = await api("/admin/communities");
      setData(result);
    } catch (e) {
      toast.showToast(e.message || "Failed to load communities", "error");
    }
  }

  async function reviewCommunityRequest(row, decision) {
    try {
      await api(`/communities/requests/${row._id}/review`, {
        method: "PATCH",
        body: JSON.stringify({ decision, adminNote: note })
      });
      toast.showToast(`Community ${decision}`, "success");
    } catch (e) {
      toast.showToast(e.message || "Failed to review community", "error");
    } finally {
      setNote("");
      setConfirmOpen(false);
      setPendingTarget(null);
      setPendingDecision(null);
      load();
    }
  }

  async function reviewJoinRequest(row, decision) {
    try {
      await api(`/communities/join-requests/${row._id}/review`, {
        method: "PATCH",
        body: JSON.stringify({ decision, adminNote: note })
      });
      toast.showToast(`Join request ${decision}`, "success");
    } catch (e) {
      toast.showToast(e.message || "Failed to review join request", "error");
    } finally {
      setNote("");
      setConfirmOpen(false);
      setPendingTarget(null);
      setPendingDecision(null);
      load();
    }
  }

  function openConfirm(target, decision, type) {
    setPendingTarget({ ...target, type });
    setPendingDecision(decision);
    setConfirmOpen(true);
  }

  function openDetail(community) {
    setSelectedCommunity(community);
    setDetailOpen(true);
  }

  useEffect(() => { load().catch(console.error); }, []);

  const { communities, creationRequests, joinRequests, posts } = data;

  // Stats
  const totalCommunities = communities.length;
  const pendingCreations = creationRequests.filter(r => r.status === "pending").length;
  const pendingJoins = joinRequests.filter(r => r.status === "pending").length;
  const totalPosts = posts.length;

  // Filtered lists
  const filteredCreations = creationRequests.filter(r => (r.name || "").toLowerCase().includes(search.toLowerCase()));
  const filteredJoins = joinRequests.filter(r => (r.community?.name || "").toLowerCase().includes(search.toLowerCase()) || (r.applicant?.fullName || "").toLowerCase().includes(search.toLowerCase()));
  const filteredCommunities = communities.filter(c => (c.name || "").toLowerCase().includes(search.toLowerCase()));
  const filteredPosts = posts.filter(p => (p.title || "").toLowerCase().includes(search.toLowerCase()));

  const tabs = [
    { key: "overview", label: "Overview", icon: Home },
    { key: "creations", label: `Creation Requests (${pendingCreations})`, icon: FileText },
    { key: "joins", label: `Join Requests (${pendingJoins})`, icon: Users },
    { key: "active", label: `Active (${totalCommunities})`, icon: ShieldCheck },
    { key: "posts", label: `Posts (${totalPosts})`, icon: MessageSquare }
  ];

  return (
    <section>
      {/* Summary Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 20 }}>
        <div style={{ backgroundColor: "#e8f7ef", borderRadius: 12, padding: 14 }}>
          <Home size={18} color="#059669" />
          <div style={{ fontSize: 24, fontWeight: "900", color: "#059669", marginTop: 6 }}>{totalCommunities}</div>
          <div style={{ fontSize: 10, color: "#475569", fontWeight: "700", textTransform: "uppercase" }}>Active Communities</div>
        </div>
        <div style={{ backgroundColor: "#fffbeb", borderRadius: 12, padding: 14 }}>
          <FileText size={18} color="#d97706" />
          <div style={{ fontSize: 24, fontWeight: "900", color: "#d97706", marginTop: 6 }}>{pendingCreations}</div>
          <div style={{ fontSize: 10, color: "#475569", fontWeight: "700", textTransform: "uppercase" }}>Pending Creations</div>
        </div>
        <div style={{ backgroundColor: "#eff6ff", borderRadius: 12, padding: 14 }}>
          <Users size={18} color="#3b82f6" />
          <div style={{ fontSize: 24, fontWeight: "900", color: "#3b82f6", marginTop: 6 }}>{pendingJoins}</div>
          <div style={{ fontSize: 10, color: "#475569", fontWeight: "700", textTransform: "uppercase" }}>Pending Joins</div>
        </div>
        <div style={{ backgroundColor: "#f7f4ed", borderRadius: 12, padding: 14 }}>
          <MessageSquare size={18} color="#0b1f33" />
          <div style={{ fontSize: 24, fontWeight: "900", color: "#0b1f33", marginTop: 6 }}>{totalPosts}</div>
          <div style={{ fontSize: 10, color: "#475569", fontWeight: "700", textTransform: "uppercase" }}>Total Posts</div>
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

      {/* Search */}
      <div className="toolbar" style={{ marginBottom: 16 }}>
        <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
          <Search size={16} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
          <input
            placeholder="Search communities, requests, or posts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: 36, width: "100%" }}
          />
        </div>
        <button onClick={load} style={{ padding: "8px 16px", backgroundColor: "#0b1f33", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 12, fontWeight: "700" }}>
          Refresh
        </button>
      </div>

      {/* Overview Tab */}
      {activeTab === "overview" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div style={{ backgroundColor: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", overflow: "hidden" }}>
            <div style={{ padding: "14px 16px", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0, fontSize: 14, color: "#0b1f33", fontWeight: "700", display: "flex", alignItems: "center", gap: 6 }}>
                <FileText size={14} /> Pending Creation Requests
              </h3>
            </div>
            <div style={{ padding: 8 }}>
              {filteredCreations.length === 0 ? (
                <p style={{ fontSize: 12, color: "#94a3b8", padding: 12 }}>No pending creation requests</p>
              ) : (
                filteredCreations.slice(0, 5).map((r, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 8px", borderBottom: i < Math.min(5, filteredCreations.length) - 1 ? "1px solid #f8fafc" : "none" }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Home size={16} color="#64748b" />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, fontWeight: "700", color: "#0b1f33" }}>{r.name}</div>
                      <div style={{ fontSize: 10, color: "#94a3b8" }}>by {r.requestedBy?.fullName || "Unknown"}</div>
                    </div>
                    <span className={`pill ${r.status}`} style={{ fontSize: 9 }}>{r.status}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div style={{ backgroundColor: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", overflow: "hidden" }}>
            <div style={{ padding: "14px 16px", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0, fontSize: 14, color: "#0b1f33", fontWeight: "700", display: "flex", alignItems: "center", gap: 6 }}>
                <Users size={14} /> Pending Join Requests
              </h3>
            </div>
            <div style={{ padding: 8 }}>
              {filteredJoins.length === 0 ? (
                <p style={{ fontSize: 12, color: "#94a3b8", padding: 12 }}>No pending join requests</p>
              ) : (
                filteredJoins.slice(0, 5).map((r, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 8px", borderBottom: i < Math.min(5, filteredJoins.length) - 1 ? "1px solid #f8fafc" : "none" }}>
                    <div style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: "#0b1f33", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <span style={{ color: "#fff", fontSize: 12, fontWeight: "700" }}>{(r.applicant?.fullName || "U").charAt(0).toUpperCase()}</span>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, fontWeight: "700", color: "#0b1f33" }}>{r.applicant?.fullName || "Unknown"}</div>
                      <div style={{ fontSize: 10, color: "#94a3b8" }}>→ {r.community?.name || "Unknown"}</div>
                    </div>
                    <span className={`pill ${r.status}`} style={{ fontSize: 9 }}>{r.status}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Creation Requests Tab */}
      {activeTab === "creations" && (
        <div style={{ overflowX: "auto" }}>
          <table className="data-table" style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ backgroundColor: "#f7f4ed" }}>
                <th style={{ padding: "10px 12px", textAlign: "left", fontSize: 11, fontWeight: "700", color: "#0b1f33", textTransform: "uppercase" }}>Community</th>
                <th style={{ padding: "10px 12px", textAlign: "left", fontSize: 11, fontWeight: "700", color: "#0b1f33", textTransform: "uppercase" }}>Requester</th>
                <th style={{ padding: "10px 12px", textAlign: "left", fontSize: 11, fontWeight: "700", color: "#0b1f33", textTransform: "uppercase" }}>Type</th>
                <th style={{ padding: "10px 12px", textAlign: "left", fontSize: 11, fontWeight: "700", color: "#0b1f33", textTransform: "uppercase" }}>Location</th>
                <th style={{ padding: "10px 12px", textAlign: "left", fontSize: 11, fontWeight: "700", color: "#0b1f33", textTransform: "uppercase" }}>ID</th>
                <th style={{ padding: "10px 12px", textAlign: "left", fontSize: 11, fontWeight: "700", color: "#0b1f33", textTransform: "uppercase" }}>Status</th>
                <th style={{ padding: "10px 12px", textAlign: "left", fontSize: 11, fontWeight: "700", color: "#0b1f33", textTransform: "uppercase" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredCreations.length === 0 ? (
                <tr><td colSpan={7} style={{ padding: 40, textAlign: "center", color: "#64748b" }}>No creation requests</td></tr>
              ) : (
                filteredCreations.map((r, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "12px", fontWeight: "700", fontSize: 13, color: "#0b1f33" }}>{r.name}</td>
                    <td style={{ padding: "12px", fontSize: 12, color: "#475569" }}>{r.requestedBy?.fullName || "Unknown"}</td>
                    <td style={{ padding: "12px" }}>
                      <span style={{ backgroundColor: "#f1f5f9", padding: "3px 8px", borderRadius: 4, fontSize: 11, color: "#475569" }}>{r.type}</span>
                    </td>
                    <td style={{ padding: "12px", fontSize: 12, color: "#475569" }}>{r.location}</td>
                    <td style={{ padding: "12px" }}><MediaLink media={r.residentIdMedia} /></td>
                    <td style={{ padding: "12px" }}><span className={`pill ${r.status}`} style={{ fontSize: 10 }}>{r.status}</span></td>
                    <td style={{ padding: "12px" }}>
                      {r.status === "pending" ? (
                        <div style={{ display: "flex", gap: 4 }}>
                          <button title="Approve" onClick={() => openConfirm(r, "approved", "creation")} style={{ padding: "6px", backgroundColor: "#e8f7ef", border: "none", borderRadius: 4, cursor: "pointer", color: "#059669" }}>
                            <Check size={14} />
                          </button>
                          <button title="Reject" onClick={() => openConfirm(r, "rejected", "creation")} style={{ padding: "6px", backgroundColor: "#fef2f2", border: "none", borderRadius: 4, cursor: "pointer", color: "#ef4444" }}>
                            <X size={14} />
                          </button>
                        </div>
                      ) : (
                        <span style={{ fontSize: 11, color: "#94a3b8" }}>Reviewed</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Join Requests Tab */}
      {activeTab === "joins" && (
        <div style={{ overflowX: "auto" }}>
          <table className="data-table" style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ backgroundColor: "#f7f4ed" }}>
                <th style={{ padding: "10px 12px", textAlign: "left", fontSize: 11, fontWeight: "700", color: "#0b1f33", textTransform: "uppercase" }}>Applicant</th>
                <th style={{ padding: "10px 12px", textAlign: "left", fontSize: 11, fontWeight: "700", color: "#0b1f33", textTransform: "uppercase" }}>Community</th>
                <th style={{ padding: "10px 12px", textAlign: "left", fontSize: 11, fontWeight: "700", color: "#0b1f33", textTransform: "uppercase" }}>Trust</th>
                <th style={{ padding: "10px 12px", textAlign: "left", fontSize: 11, fontWeight: "700", color: "#0b1f33", textTransform: "uppercase" }}>ID Proof</th>
                <th style={{ padding: "10px 12px", textAlign: "left", fontSize: 11, fontWeight: "700", color: "#0b1f33", textTransform: "uppercase" }}>Status</th>
                <th style={{ padding: "10px 12px", textAlign: "left", fontSize: 11, fontWeight: "700", color: "#0b1f33", textTransform: "uppercase" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredJoins.length === 0 ? (
                <tr><td colSpan={6} style={{ padding: 40, textAlign: "center", color: "#64748b" }}>No join requests</td></tr>
              ) : (
                filteredJoins.map((r, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "12px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: "#0b1f33", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <span style={{ color: "#fff", fontSize: 11, fontWeight: "700" }}>{(r.applicant?.fullName || "U").charAt(0).toUpperCase()}</span>
                        </div>
                        <span style={{ fontSize: 12, fontWeight: "700", color: "#0b1f33" }}>{r.applicant?.fullName || "Unknown"}</span>
                      </div>
                    </td>
                    <td style={{ padding: "12px", fontSize: 12, color: "#475569" }}>{r.community?.name || "Unknown"}</td>
                    <td style={{ padding: "12px", fontWeight: "700", fontSize: 12, color: "#0b1f33" }}>{r.applicant?.trustPoints ?? 0}</td>
                    <td style={{ padding: "12px" }}><MediaLink media={r.idMedia} url={r.idImageUrl} /></td>
                    <td style={{ padding: "12px" }}><span className={`pill ${r.status}`} style={{ fontSize: 10 }}>{r.status}</span></td>
                    <td style={{ padding: "12px" }}>
                      {r.status === "pending" ? (
                        <div style={{ display: "flex", gap: 4 }}>
                          <button title="Approve" onClick={() => openConfirm(r, "approved", "join")} style={{ padding: "6px", backgroundColor: "#e8f7ef", border: "none", borderRadius: 4, cursor: "pointer", color: "#059669" }}>
                            <Check size={14} />
                          </button>
                          <button title="Reject" onClick={() => openConfirm(r, "rejected", "join")} style={{ padding: "6px", backgroundColor: "#fef2f2", border: "none", borderRadius: 4, cursor: "pointer", color: "#ef4444" }}>
                            <X size={14} />
                          </button>
                        </div>
                      ) : (
                        <span style={{ fontSize: 11, color: "#94a3b8" }}>Reviewed</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Active Communities Tab */}
      {activeTab === "active" && (
        <div style={{ overflowX: "auto" }}>
          <table className="data-table" style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ backgroundColor: "#f7f4ed" }}>
                <th style={{ padding: "10px 12px", textAlign: "left", fontSize: 11, fontWeight: "700", color: "#0b1f33", textTransform: "uppercase" }}>Community</th>
                <th style={{ padding: "10px 12px", textAlign: "left", fontSize: 11, fontWeight: "700", color: "#0b1f33", textTransform: "uppercase" }}>Type</th>
                <th style={{ padding: "10px 12px", textAlign: "left", fontSize: 11, fontWeight: "700", color: "#0b1f33", textTransform: "uppercase" }}>Location</th>
                <th style={{ padding: "10px 12px", textAlign: "left", fontSize: 11, fontWeight: "700", color: "#0b1f33", textTransform: "uppercase" }}>Join Code</th>
                <th style={{ padding: "10px 12px", textAlign: "left", fontSize: 11, fontWeight: "700", color: "#0b1f33", textTransform: "uppercase" }}>Status</th>
                <th style={{ padding: "10px 12px", textAlign: "left", fontSize: 11, fontWeight: "700", color: "#0b1f33", textTransform: "uppercase" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredCommunities.length === 0 ? (
                <tr><td colSpan={6} style={{ padding: 40, textAlign: "center", color: "#64748b" }}>No active communities</td></tr>
              ) : (
                filteredCommunities.map((c, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid #f1f5f9", cursor: "pointer" }} onClick={() => openDetail(c)}>
                    <td style={{ padding: "12px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: "#0b1f33", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <Home size={16} color="#fff" />
                        </div>
                        <span style={{ fontSize: 13, fontWeight: "700", color: "#0b1f33" }}>{c.name}</span>
                      </div>
                    </td>
                    <td style={{ padding: "12px" }}>
                      <span style={{ backgroundColor: "#f1f5f9", padding: "3px 8px", borderRadius: 4, fontSize: 11, color: "#475569" }}>{c.type}</span>
                    </td>
                    <td style={{ padding: "12px", fontSize: 12, color: "#475569" }}>{c.location}</td>
                    <td style={{ padding: "12px" }}>
                      <code style={{ backgroundColor: "#f1f5f9", padding: "3px 8px", borderRadius: 4, fontSize: 11, color: "#0b1f33", fontWeight: "700" }}>{c.joinCode}</code>
                    </td>
                    <td style={{ padding: "12px" }}><span className={`pill ${c.status}`} style={{ fontSize: 10 }}>{c.status}</span></td>
                    <td style={{ padding: "12px" }} onClick={(e) => e.stopPropagation()}>
                      <button title="View Details" onClick={() => openDetail(c)} style={{ padding: "6px", backgroundColor: "#f1f5f9", border: "none", borderRadius: 4, cursor: "pointer", color: "#0b1f33" }}>
                        <Eye size={14} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Posts Tab */}
      {activeTab === "posts" && (
        <div style={{ overflowX: "auto" }}>
          <table className="data-table" style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ backgroundColor: "#f7f4ed" }}>
                <th style={{ padding: "10px 12px", textAlign: "left", fontSize: 11, fontWeight: "700", color: "#0b1f33", textTransform: "uppercase" }}>Post</th>
                <th style={{ padding: "10px 12px", textAlign: "left", fontSize: 11, fontWeight: "700", color: "#0b1f33", textTransform: "uppercase" }}>Community</th>
                <th style={{ padding: "10px 12px", textAlign: "left", fontSize: 11, fontWeight: "700", color: "#0b1f33", textTransform: "uppercase" }}>Author</th>
                <th style={{ padding: "10px 12px", textAlign: "left", fontSize: 11, fontWeight: "700", color: "#0b1f33", textTransform: "uppercase" }}>Date</th>
              </tr>
            </thead>
            <tbody>
              {filteredPosts.length === 0 ? (
                <tr><td colSpan={4} style={{ padding: 40, textAlign: "center", color: "#64748b" }}>No posts yet</td></tr>
              ) : (
                filteredPosts.map((p, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "12px", fontWeight: "600", fontSize: 13, color: "#0b1f33" }}>{p.title || p.body?.slice(0, 60) || "Untitled"}</td>
                    <td style={{ padding: "12px", fontSize: 12, color: "#475569" }}>{p.community?.name || "Unknown"}</td>
                    <td style={{ padding: "12px", fontSize: 12, color: "#475569" }}>{p.author?.fullName || "Unknown"}</td>
                    <td style={{ padding: "12px", fontSize: 11, color: "#64748b" }}>{new Date(p.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Community Detail Modal */}
      {detailOpen && selectedCommunity && (
        <div className="modal-overlay" onClick={() => setDetailOpen(false)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 600, maxHeight: "90vh", overflowY: "auto" }}>
            <div className="modal-header">
              <h3>Community Details</h3>
              <button className="modal-close-btn" onClick={() => setDetailOpen(false)}><X size={20} /></button>
            </div>
            <div className="modal-body">
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20, padding: 16, backgroundColor: "#f7f4ed", borderRadius: 12 }}>
                <div style={{ width: 48, height: 48, borderRadius: 12, backgroundColor: "#0b1f33", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Home size={24} color="#fff" />
                </div>
                <div>
                  <h2 style={{ margin: 0, fontSize: 18, color: "#0b1f33" }}>{selectedCommunity.name}</h2>
                  <span className={`pill ${selectedCommunity.status}`} style={{ fontSize: 10, marginTop: 4 }}>{selectedCommunity.status}</span>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
                {[
                  { icon: MapPin, label: "Location", value: selectedCommunity.location || "N/A" },
                  { icon: Activity, label: "Type", value: selectedCommunity.type || "N/A" },
                  { icon: Hash, label: "Join Code", value: selectedCommunity.joinCode || "N/A" },
                  { icon: Calendar, label: "Created", value: selectedCommunity.createdAt ? new Date(selectedCommunity.createdAt).toLocaleDateString() : "N/A" }
                ].map((item, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: 10, backgroundColor: "#faf9f7", borderRadius: 8 }}>
                    <item.icon size={16} color="#64748b" />
                    <div>
                      <div style={{ fontSize: 10, color: "#94a3b8", textTransform: "uppercase", fontWeight: "600" }}>{item.label}</div>
                      <div style={{ fontSize: 13, color: "#475569", fontWeight: "600" }}>{item.value}</div>
                    </div>
                  </div>
                ))}
              </div>

              {selectedCommunity.description && (
                <div style={{ marginBottom: 16, padding: 12, backgroundColor: "#f7f4ed", borderRadius: 8 }}>
                  <div style={{ fontSize: 10, color: "#94a3b8", textTransform: "uppercase", fontWeight: "600", marginBottom: 4 }}>Description</div>
                  <div style={{ fontSize: 13, color: "#475569" }}>{selectedCommunity.description}</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmOpen}
        title={`${pendingDecision === "approved" ? "Approve" : "Reject"} ${pendingTarget?.type === "creation" ? "Community Creation" : "Join Request"}`}
        message={`${pendingDecision === "approved" ? "Approve" : "Reject"} for ${pendingTarget?.name || pendingTarget?.community?.name || 'this request'}?`}
        confirmText={pendingDecision === "approved" ? "Approve" : "Reject"}
        variant={pendingDecision === "rejected" ? "danger" : "info"}
        onConfirm={() => {
          if (pendingTarget?.type === "creation") reviewCommunityRequest(pendingTarget, pendingDecision);
          else reviewJoinRequest(pendingTarget, pendingDecision);
        }}
        onCancel={() => { setConfirmOpen(false); setPendingTarget(null); setPendingDecision(null); }}
      />
    </section>
  );
}