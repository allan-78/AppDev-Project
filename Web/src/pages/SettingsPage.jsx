import React, { useState, useEffect } from "react";
import { RefreshCcw, Save, Shield, Wallet, AlertTriangle, CheckCircle, Edit, Eye, EyeOff, Settings as SettingsIcon, DollarSign, Users, Activity, Clock } from "lucide-react";
import { api } from "../api/client";
import { useToast } from "../components/Toast";
import ConfirmDialog from "../components/ConfirmDialog";

export default function SettingsPage({ community, onCommunityChange }) {
  const [message, setMessage] = useState("");
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    startingPoints: community?.trustRules?.startingPoints || 100,
    escrowPoints: community?.trustRules?.escrowPoints || 0,
    latePenaltyPerDay: community?.trustRules?.latePenaltyPerDay || 5,
    damagePenalty: community?.trustRules?.damagePenalty || 20,
    successfulBorrowReward: community?.trustRules?.successfulBorrowReward || 5,
    lendingReward: community?.trustRules?.lendingReward || 3,
    maxConcurrentBorrows: community?.trustRules?.maxConcurrentBorrows || 1
  });
  const [stats, setStats] = useState({});
  const [bulkActionOpen, setBulkActionOpen] = useState(false);
  const [bulkActionType, setBulkActionType] = useState("");
  const toast = useToast();

  useEffect(() => { loadStats(); }, []);

  async function loadStats() {
    try {
      const data = await api("/admin/community-stats");
      setStats(data.stats || {});
    } catch (e) {
      console.warn("Failed to load community stats", e);
    }
  }

  function syncForm() {
    setForm({
      startingPoints: community?.trustRules?.startingPoints || 100,
      escrowPoints: community?.trustRules?.escrowPoints || 0,
      latePenaltyPerDay: community?.trustRules?.latePenaltyPerDay || 5,
      damagePenalty: community?.trustRules?.damagePenalty || 20,
      successfulBorrowReward: community?.trustRules?.successfulBorrowReward || 5,
      lendingReward: community?.trustRules?.lendingReward || 3,
      maxConcurrentBorrows: community?.trustRules?.maxConcurrentBorrows || 1
    });
  }

  async function regenerate() {
    try {
      const data = await api("/communities/mine/regenerate-code", { method: "POST" });
      onCommunityChange(data.community);
      toast.showToast("Join code regenerated", "success");
    } catch (e) {
      toast.showToast(e.message || "Failed to regenerate code", "error");
    }
  }

  async function saveRules() {
    try {
      const data = await api("/admin/trust-rules", { method: "PATCH", body: JSON.stringify(form) });
      onCommunityChange(data.community);
      toast.showToast("Trust rules updated successfully", "success");
      setEditing(false);
      loadStats();
    } catch (e) {
      toast.showToast(e.message || "Failed to update rules", "error");
    }
  }

  async function handleBulkAction() {
    try {
      await api("/admin/bulk-actions", {
        method: "POST",
        body: JSON.stringify({ action: bulkActionType })
      });
      toast.showToast("Bulk action completed", "success");
      setBulkActionOpen(false);
      setBulkActionType("");
      loadStats();
    } catch (e) {
      toast.showToast(e.message || "Bulk action failed", "error");
    }
  }

  const ruleFields = [
    { key: "startingPoints", label: "Starting Points", icon: Wallet, desc: "Trust points new residents start with", min: 0, max: 500 },
    { key: "escrowPoints", label: "Escrow Points", icon: Shield, desc: "Minimum escrow required for borrowing", min: 0, max: 100 },
    { key: "latePenaltyPerDay", label: "Late Penalty Per Day", icon: AlertTriangle, desc: "Points deducted per day for late returns", min: 0, max: 50 },
    { key: "damagePenalty", label: "Damage Penalty", icon: AlertTriangle, desc: "Points deducted for damaged items", min: 0, max: 100 },
    { key: "successfulBorrowReward", label: "Borrow Reward", icon: CheckCircle, desc: "Points rewarded for on-time return", min: 0, max: 50 },
    { key: "lendingReward", label: "Lending Reward", icon: Users, desc: "Points rewarded to lender after return", min: 0, max: 50 },
    { key: "maxConcurrentBorrows", label: "Max Concurrent Borrows", icon: Activity, desc: "Maximum active borrows per resident", min: 1, max: 10 }
  ];

  return (
    <section style={{ maxWidth: 900, margin: "0 auto" }}>
      {/* Community Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, padding: 20, backgroundColor: "#fff", borderRadius: 12, border: "1px solid #e2e8f0" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 20, color: "#0b1f33" }}>{community?.name || "Community Settings"}</h1>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "#64748b" }}>{community?.location}</p>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10 }}>
            <span style={{ fontSize: 12, color: "#64748b" }}>Join Code:</span>
            <code style={{ backgroundColor: "#f7f4ed", padding: "4px 10px", borderRadius: 6, fontSize: 14, fontWeight: "700", color: "#0b1f33" }}>{community?.joinCode}</code>
            <button onClick={regenerate} title="Regenerate join code" style={{ padding: "6px", backgroundColor: "#f1f5f9", border: "none", borderRadius: 4, cursor: "pointer", color: "#64748b" }}>
              <RefreshCcw size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Community Stats */}
      {Object.keys(stats).length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginBottom: 24 }}>
          {[
            { label: "Total Members", value: stats.totalMembers || 0, icon: Users, color: "#059669", bg: "#e8f7ef" },
            { label: "Active Borrowings", value: stats.activeBorrowings || 0, icon: Activity, color: "#3b82f6", bg: "#eff6ff" },
            { label: "Avg Trust Points", value: stats.avgTrustPoints || 0, icon: Wallet, color: "#0b1f33", bg: "#f7f4ed" },
            { label: "Total Tools", value: stats.totalTools || 0, icon: Shield, color: "#8b5cf6", bg: "#f5f3ff" }
          ].map((card, i) => (
            <div key={i} style={{ backgroundColor: card.bg, borderRadius: 12, padding: 14 }}>
              <card.icon size={18} color={card.color} />
              <div style={{ fontSize: 22, fontWeight: "900", color: card.color, marginTop: 6 }}>{card.value}</div>
              <div style={{ fontSize: 10, color: "#475569", fontWeight: "700", textTransform: "uppercase" }}>{card.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Trust Economy Rules */}
      <div style={{ backgroundColor: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", overflow: "hidden", marginBottom: 24 }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 16, color: "#0b1f33", display: "flex", alignItems: "center", gap: 6 }}>
              <SettingsIcon size={16} /> Trust Economy Rules
            </h2>
            <p style={{ margin: "4px 0 0", fontSize: 12, color: "#64748b" }}>Configure the trust point economy for your community</p>
          </div>
          {editing ? (
            <div style={{ display: "flex", gap: 8 }}>
              <button className="primary" onClick={saveRules} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", fontSize: 12 }}>
                <Save size={14} /> Save Changes
              </button>
              <button className="ghost" onClick={() => { setEditing(false); syncForm(); }} style={{ padding: "8px 14px", fontSize: 12 }}>
                Cancel
              </button>
            </div>
          ) : (
            <button className="primary" onClick={() => setEditing(true)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", fontSize: 12 }}>
              <Edit size={14} /> Edit Rules
            </button>
          )}
        </div>
        <div style={{ padding: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
            {ruleFields.map((rule) => (
              <div key={rule.key} style={{ padding: 14, backgroundColor: "#faf9f7", borderRadius: 10, border: "1px solid #f1f5f9" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <rule.icon size={16} color="#64748b" />
                  <span style={{ fontSize: 13, fontWeight: "700", color: "#0b1f33" }}>{rule.label}</span>
                </div>
                <p style={{ margin: "0 0 8px", fontSize: 11, color: "#94a3b8" }}>{rule.desc}</p>
                {editing ? (
                  <input
                    type="number"
                    value={form[rule.key]}
                    onChange={(e) => setForm({ ...form, [rule.key]: Number(e.target.value) })}
                    min={rule.min}
                    max={rule.max}
                    style={{ padding: "8px 10px", border: "1px solid #ded8cc", borderRadius: 6, fontSize: 14, fontWeight: "700", width: "100%" }}
                  />
                ) : (
                  <div style={{ fontSize: 22, fontWeight: "900", color: "#0b1f33" }}>
                    {community?.trustRules?.[rule.key] ?? form[rule.key]}
                    <span style={{ fontSize: 12, color: "#94a3b8", fontWeight: "400", marginLeft: 6 }}>pts</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bulk Actions */}
      <div style={{ backgroundColor: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", padding: 20, marginBottom: 24 }}>
        <h3 style={{ margin: "0 0 4px", fontSize: 14, color: "#0b1f33", display: "flex", alignItems: "center", gap: 6 }}>
          <Shield size={14} /> Bulk Actions
        </h3>
        <p style={{ fontSize: 12, color: "#64748b", margin: "0 0 12px" }}>Perform actions that affect all community members</p>
        <button className="secondary" onClick={() => setBulkActionOpen(true)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", fontSize: 12 }}>
          <Shield size={14} /> Open Bulk Actions
        </button>
      </div>

      {/* Bulk Actions Modal */}
      <ConfirmDialog
        isOpen={bulkActionOpen}
        title="Bulk Community Actions"
        message="Perform bulk actions on community members. These actions affect all approved residents."
        confirmText="Execute Action"
        variant="info"
        onConfirm={handleBulkAction}
        onCancel={() => { setBulkActionOpen(false); setBulkActionType(""); }}
      >
        {bulkActionOpen && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <label style={{ display: "block", marginBottom: 4, fontWeight: 600, fontSize: 12 }}>Select Action</label>
              <select value={bulkActionType} onChange={(e) => setBulkActionType(e.target.value)} style={{ width: "100%", padding: 8, border: "1px solid #ded8cc", borderRadius: 6 }}>
                <option value="">-- Select an action --</option>
                <option value="reset_trust">Reset All Trust Points to Starting Value</option>
                <option value="notify_all">Send Notification to All Residents</option>
                <option value="export_data">Export Community Data</option>
              </select>
            </div>
            {bulkActionType === "notify_all" && (
              <div>
                <label style={{ display: "block", marginBottom: 4, fontWeight: 600, fontSize: 12 }}>Notification Message</label>
                <textarea placeholder="Enter your message..." rows={3} style={{ width: "100%", padding: 8, border: "1px solid #ded8cc", borderRadius: 6, resize: "vertical" }} />
              </div>
            )}
            {bulkActionType === "reset_trust" && (
              <div style={{ padding: 10, backgroundColor: "#fef2f2", borderRadius: 6, border: "1px solid #fecaca" }}>
                <span style={{ fontSize: 12, color: "#ef4444", fontWeight: "600" }}>This will reset ALL trust points for ALL members to the starting value. This cannot be undone.</span>
              </div>
            )}
          </div>
        )}
      </ConfirmDialog>

      {message && (
        <div style={{ padding: 12, backgroundColor: "#e2f2e9", borderRadius: 8, marginTop: 12 }}>
          <p style={{ margin: 0, color: "#16a34a", fontWeight: "600", fontSize: 13 }}>{message}</p>
        </div>
      )}
    </section>
  );
}