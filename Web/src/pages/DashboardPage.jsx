import React, { useEffect, useState } from "react";
import { Wrench, Users, ClipboardList, AlertTriangle, Clock, ShieldCheck, ChevronRight, MessageSquare, Plus, TrendingUp, Activity, CheckCircle, XCircle } from "lucide-react";
import { api } from "../api/client";
import { LineChart, BarChart, DoughnutChart, Legend } from "../components/Chart";
import { useNavigate } from "react-router-dom";

export default function DashboardPage() {
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [announcement, setAnnouncement] = useState({ title: "", message: "" });
  const [sent, setSent] = useState("");
  const [trends, setTrends] = useState([]);
  const [trustDistribution, setTrustDistribution] = useState([]);
  const [toolStatus, setToolStatus] = useState([]);
  const [recentUsers, setRecentUsers] = useState([]);
  const [recentBorrows, setRecentBorrows] = useState([]);
  const [recentDisputes, setRecentDisputes] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    load().catch(console.error);
  }, []);

  async function load() {
    setLoading(true);
    try {
      const [statsData, usersData, borrowsData, disputesData] = await Promise.all([
        api("/admin/dashboard"),
        api("/admin/users"),
        api("/admin/borrow-verifications"),
        api("/disputes").catch(() => ({ disputes: [] }))
      ]);
      setStats(statsData);
      setRecentUsers((usersData.users || []).slice(0, 5));
      setRecentBorrows((borrowsData.requests || borrowsData.verifications || []).slice(0, 5));
      setRecentDisputes((disputesData.disputes || []).slice(0, 5));
      
      // Load chart data (these endpoints may not exist yet)
      setTrends([]);
      setTrustDistribution([]);
      setToolStatus([]);
    } catch (e) {
      console.warn("Failed to load dashboard data", e);
    } finally {
      setLoading(false);
    }
  }

  async function broadcast(event) {
    event.preventDefault();
    setSent("");
    try {
      const result = await api("/admin/announcements", {
        method: "POST",
        body: JSON.stringify(announcement)
      });
      setAnnouncement({ title: "", message: "" });
      setSent(`Announcement sent to ${result.sent} resident(s).`);
    } catch (e) {
      setSent("Failed to send announcement");
    }
  }

  const statCards = [
    { label: "Total Tools", value: stats.totalTools, icon: Wrench, color: "#059669", bg: "#e8f7ef", link: "/inventory" },
    { label: "Pending Users", value: stats.pendingUsers, icon: Users, color: "#d97706", bg: "#fffbeb", link: "/users" },
    { label: "Active Borrowings", value: stats.activeBorrowings, icon: ClipboardList, color: "#3b82f6", bg: "#eff6ff", link: "/borrowing" },
    { label: "Overdue Returns", value: stats.overdue, icon: AlertTriangle, color: "#ef4444", bg: "#fef2f2", link: "/borrowing" },
    { label: "Open Disputes", value: stats.disputes, icon: XCircle, color: "#dc2626", bg: "#fef2f2", link: "/disputes" },
    { label: "Maintenance Cases", value: stats.maintenanceCases, icon: Wrench, color: "#0b1f33", bg: "#f7f4ed", link: "/maintenance" }
  ];

  return (
    <section style={{ maxWidth: 1200, margin: "0 auto" }}>
      {/* Page Header */}
      <div style={{ marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, color: "#0b1f33" }}>Dashboard</h1>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "#64748b" }}>Community overview and quick actions</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button 
            onClick={() => {
              const el = document.getElementById("announcement-form");
              if (el) el.scrollIntoView({ behavior: "smooth" });
            }} 
            style={{ padding: "8px 16px", backgroundColor: "#0b1f33", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: "700", display: "flex", alignItems: "center", gap: 6 }}
          >
            <MessageSquare size={14} /> New Announcement
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 24 }}>
        {statCards.map((card, i) => (
          <div 
            key={i}
            onClick={() => navigate(card.link)}
            style={{ 
              backgroundColor: card.bg, 
              borderRadius: 12, 
              padding: 16, 
              cursor: "pointer",
              border: "1px solid transparent",
              transition: "all 0.2s"
            }}
            onMouseEnter={(e) => e.currentTarget.style.borderColor = card.color + "40"}
            onMouseLeave={(e) => e.currentTarget.style.borderColor = "transparent"}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
              <card.icon size={20} color={card.color} />
              <ChevronRight size={14} color={card.color + "80"} />
            </div>
            <div style={{ fontSize: 28, fontWeight: "900", color: card.color, lineHeight: 1.2 }}>
              {loading ? "-" : (card.value ?? 0)}
            </div>
            <div style={{ fontSize: 11, color: "#475569", fontWeight: "600", marginTop: 4, textTransform: "uppercase", letterSpacing: 0.3 }}>
              {card.label}
            </div>
          </div>
        ))}
      </div>

      {/* Charts Section */}
      <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 1fr", gap: 16, marginBottom: 24 }}>
        <div style={{ backgroundColor: "#fff", borderRadius: 12, padding: 16, border: "1px solid #e2e8f0" }}>
          <h3 style={{ margin: "0 0 12px 0", fontSize: 14, color: "#0b1f33", fontWeight: "700" }}>Borrowing Trends</h3>
          <LineChart data={trends} color="#0b1f33" height={150} />
        </div>
        <div style={{ backgroundColor: "#fff", borderRadius: 12, padding: 16, border: "1px solid #e2e8f0" }}>
          <h3 style={{ margin: "0 0 12px 0", fontSize: 14, color: "#0b1f33", fontWeight: "700" }}>Trust Distribution</h3>
          <BarChart data={trustDistribution} color="#059669" height={150} />
          <Legend data={trustDistribution} />
        </div>
        <div style={{ backgroundColor: "#fff", borderRadius: 12, padding: 16, border: "1px solid #e2e8f0" }}>
          <h3 style={{ margin: "0 0 12px 0", fontSize: 14, color: "#0b1f33", fontWeight: "700" }}>Tool Status</h3>
          <DoughnutChart data={toolStatus} height={150} />
          <Legend data={toolStatus} />
        </div>
      </div>

      {/* Recent Activity & Quick Links */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
        {/* Recent Users */}
        <div style={{ backgroundColor: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", overflow: "hidden" }}>
          <div style={{ padding: "14px 16px", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3 style={{ margin: 0, fontSize: 14, color: "#0b1f33", fontWeight: "700", display: "flex", alignItems: "center", gap: 6 }}>
              <Users size={14} /> Recent Residents
            </h3>
            <button onClick={() => navigate("/users")} style={{ fontSize: 11, color: "#0b1f33", fontWeight: "600", border: "none", background: "none", cursor: "pointer" }}>
              View All
            </button>
          </div>
          <div style={{ padding: 8 }}>
            {loading ? (
              <p style={{ fontSize: 12, color: "#94a3b8", padding: 12 }}>Loading...</p>
            ) : recentUsers.length === 0 ? (
              <p style={{ fontSize: 12, color: "#94a3b8", padding: 12 }}>No users yet</p>
            ) : (
              recentUsers.map((u, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 8px", borderBottom: i < recentUsers.length - 1 ? "1px solid #f8fafc" : "none", cursor: "pointer" }} onClick={() => navigate("/users")}>
                  <div style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: "#0b1f33", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ color: "#fff", fontSize: 12, fontWeight: "700" }}>{(u.fullName || "U").charAt(0).toUpperCase()}</span>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: "700", color: "#0b1f33" }}>{u.fullName}</div>
                    <div style={{ fontSize: 10, color: "#94a3b8" }}>{u.email}</div>
                  </div>
                  <span className={`pill ${u.status}`} style={{ fontSize: 9 }}>{u.status}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Borrowings */}
        <div style={{ backgroundColor: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", overflow: "hidden" }}>
          <div style={{ padding: "14px 16px", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3 style={{ margin: 0, fontSize: 14, color: "#0b1f33", fontWeight: "700", display: "flex", alignItems: "center", gap: 6 }}>
              <ClipboardList size={14} /> Pending Verifications
            </h3>
            <button onClick={() => navigate("/borrowing")} style={{ fontSize: 11, color: "#0b1f33", fontWeight: "600", border: "none", background: "none", cursor: "pointer" }}>
              View All
            </button>
          </div>
          <div style={{ padding: 8 }}>
            {loading ? (
              <p style={{ fontSize: 12, color: "#94a3b8", padding: 12 }}>Loading...</p>
            ) : recentBorrows.length === 0 ? (
              <p style={{ fontSize: 12, color: "#94a3b8", padding: 12 }}>No pending verifications</p>
            ) : (
              recentBorrows.map((b, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 8px", borderBottom: i < recentBorrows.length - 1 ? "1px solid #f8fafc" : "none" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: "700", color: "#0b1f33" }}>{b.tool?.name || "Tool"}</div>
                    <div style={{ fontSize: 10, color: "#94a3b8" }}>by {b.borrower?.fullName || "Unknown"}</div>
                  </div>
                  <span className={`pill ${b.status}`} style={{ fontSize: 9 }}>{b.status}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Disputes & Announcement */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
        {/* Recent Disputes */}
        <div style={{ backgroundColor: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", overflow: "hidden" }}>
          <div style={{ padding: "14px 16px", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3 style={{ margin: 0, fontSize: 14, color: "#0b1f33", fontWeight: "700", display: "flex", alignItems: "center", gap: 6 }}>
              <AlertTriangle size={14} /> Open Disputes
            </h3>
            <button onClick={() => navigate("/disputes")} style={{ fontSize: 11, color: "#0b1f33", fontWeight: "600", border: "none", background: "none", cursor: "pointer" }}>
              View All
            </button>
          </div>
          <div style={{ padding: 8 }}>
            {loading ? (
              <p style={{ fontSize: 12, color: "#94a3b8", padding: 12 }}>Loading...</p>
            ) : recentDisputes.length === 0 ? (
              <p style={{ fontSize: 12, color: "#94a3b8", padding: 12 }}>No open disputes</p>
            ) : (
              recentDisputes.map((d, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 8px", borderBottom: i < recentDisputes.length - 1 ? "1px solid #f8fafc" : "none" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: "700", color: "#ef4444" }}>{d.type || "Dispute"}</div>
                    <div style={{ fontSize: 10, color: "#94a3b8" }}>{d.description?.slice(0, 50) || "No description"}</div>
                  </div>
                  <span className={`pill ${d.status}`} style={{ fontSize: 9 }}>{d.status}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div style={{ backgroundColor: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", overflow: "hidden" }}>
          <div style={{ padding: "14px 16px", borderBottom: "1px solid #f1f5f9" }}>
            <h3 style={{ margin: 0, fontSize: 14, color: "#0b1f33", fontWeight: "700", display: "flex", alignItems: "center", gap: 6 }}>
              <Activity size={14} /> Quick Actions
            </h3>
          </div>
          <div style={{ padding: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {[
              { label: "Add Tool", icon: Plus, color: "#059669", bg: "#e8f7ef", link: "/inventory" },
              { label: "View Users", icon: Users, color: "#3b82f6", bg: "#eff6ff", link: "/users" },
              { label: "Reports", icon: TrendingUp, color: "#0b1f33", bg: "#f7f4ed", link: "/reports" },
              { label: "Trust Rules", icon: ShieldCheck, color: "#d97706", bg: "#fffbeb", link: "/settings" },
              { label: "Pending IDs", icon: CheckCircle, color: "#8b5cf6", bg: "#f5f3ff", link: "/users" },
              { label: "Maintenance", icon: Wrench, color: "#64748b", bg: "#f1f5f9", link: "/maintenance" }
            ].map((action, i) => (
              <button
                key={i}
                onClick={() => navigate(action.link)}
                style={{
                  padding: "10px", borderRadius: 8, backgroundColor: action.bg, border: "none", cursor: "pointer",
                  display: "flex", alignItems: "center", gap: 8, fontSize: 12, fontWeight: "700", color: action.color
                }}
              >
                <action.icon size={16} />
                {action.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Global Announcement */}
      <div id="announcement-form" style={{ backgroundColor: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", padding: 20, marginBottom: 24 }}>
        <h3 style={{ margin: "0 0 4px 0", fontSize: 14, color: "#0b1f33", fontWeight: "700", display: "flex", alignItems: "center", gap: 6 }}>
          <MessageSquare size={14} /> Broadcast Announcement
        </h3>
        <p style={{ fontSize: 12, color: "#64748b", margin: "0 0 16px 0" }}>Send a notification to all mobile app users</p>
        <form onSubmit={broadcast} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <input
            value={announcement.title}
            onChange={(e) => setAnnouncement({ ...announcement, title: e.target.value })}
            placeholder="Announcement title"
            required
            style={{ padding: "10px 14px", border: "1px solid #ded8cc", borderRadius: 8, fontSize: 13 }}
          />
          <textarea
            value={announcement.message}
            onChange={(e) => setAnnouncement({ ...announcement, message: e.target.value })}
            placeholder="Message to mobile users..."
            required
            rows={3}
            style={{ padding: "10px 14px", border: "1px solid #ded8cc", borderRadius: 8, fontSize: 13, resize: "vertical" }}
          />
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button 
              type="submit"
              style={{ padding: "10px 20px", backgroundColor: "#0b1f33", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: "700" }}
            >
              Send Announcement
            </button>
            {sent && <span style={{ fontSize: 12, color: sent.includes("Failed") ? "#ef4444" : "#059669", fontWeight: "600" }}>{sent}</span>}
          </div>
        </form>
      </div>
    </section>
  );
}