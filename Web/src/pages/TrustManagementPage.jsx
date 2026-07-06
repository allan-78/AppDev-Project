import React, { useEffect, useState } from "react";
import { api } from "../api/client";
import DataTable from "../components/DataTable";
import ConfirmDialog from "../components/ConfirmDialog";
import { useToast } from "../components/Toast";

export default function TrustManagementPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [amount, setAmount] = useState(0);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
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

  async function submitAdjustment() {
    if (!selectedUser || !amount) return;
    setSubmitting(true);
    try {
      await api(`/admin/users/${selectedUser._id}/trust-points`, {
        method: "PATCH",
        body: JSON.stringify({
          amount: Number(amount),
          reason: reason || "Manual admin adjustment"
        })
      });
      toast.showToast("Trust points adjusted successfully", "success");
      setAdjustOpen(false);
      setSelectedUser(null);
      setAmount(0);
      setReason("");
      load();
    } catch (e) {
      toast.showToast(e.message || "Failed to adjust trust points", "error");
    } finally {
      setSubmitting(false);
    }
  }

  function openAdjustModal(user) {
    setSelectedUser(user);
    setAmount(0);
    setReason("");
    setAdjustOpen(true);
  }

  const columns = [
    { key: "fullName", label: "Resident", render: (u) => u.fullName },
    { key: "email", label: "Email" },
    { key: "trustPoints", label: "Trust Points", render: (u) => <strong>{u.trustPoints}</strong> },
    { key: "status", label: "Status", render: (u) => u.status },
    {
      key: "actions",
      label: "Actions",
      render: (u) => (
        <button
          onClick={() => openAdjustModal(u)}
          style={{ padding: "6px 12px", fontSize: 12, backgroundColor: "#0b1f33", color: "#fff", border: "none", borderRadius: 4, cursor: "pointer" }}
        >
          Adjust Points
        </button>
      )
    }
  ];

  return (
    <section>
      <div className="section-band">
        <h2>Trust Point Management</h2>
        <p>Manually adjust trust points for residents. All adjustments are logged in the audit trail.</p>
      </div>

      <DataTable
        rows={users}
        columns={columns}
        loading={loading}
        emptyMessage="No users found"
      />

      <ConfirmDialog
        isOpen={adjustOpen}
        title="Adjust Trust Points"
        message={`Adjust trust points for ${selectedUser?.fullName || "this user"}?`}
        confirmText={amount >= 0 ? "Add Points" : "Deduct Points"}
        variant={amount >= 0 ? "success" : "danger"}
        onConfirm={submitAdjustment}
        onCancel={() => { setAdjustOpen(false); setSelectedUser(null); }}
      >
        {selectedUser && (
          <div style={{ marginBottom: 16, padding: 12, backgroundColor: "#f7f4ed", borderRadius: 8 }}>
            <p><strong>Current Points:</strong> {selectedUser.trustPoints}</p>
            <p><strong>User:</strong> {selectedUser.fullName}</p>
            <p><strong>Email:</strong> {selectedUser.email}</p>
          </div>
        )}

        {adjustOpen && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <label style={{ display: "block", marginBottom: 4, fontWeight: 600 }}>
                Adjustment Amount {amount < 0 && "(Negative to Deduct)"}
              </label>
              <input
                type="number"
                value={amount}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setAmount(val);
                }}
                min="-1000"
                max="10000"
                disabled={submitting}
                style={{ width: "100%", padding: 8, border: "1px solid #ded8cc", borderRadius: 6 }}
              />
              <small style={{ color: "#64748b", fontSize: 12 }}>
                Use negative values to deduct points (e.g., -50)
              </small>
            </div>

            <div>
              <label style={{ display: "block", marginBottom: 4, fontWeight: 600 }}>
                Reason for Adjustment
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Explain why you're adjusting these points..."
                disabled={submitting}
                rows={3}
                style={{ width: "100%", padding: 8, border: "1px solid #ded8cc", borderRadius: 6, resize: "vertical" }}
              />
            </div>

            {(selectedUser && amount !== 0) && (
              <div style={{ padding: 10, backgroundColor: amount > 0 ? "#e8f7ef" : "#fff1f2", borderRadius: 6, border: `1px solid ${amount > 0 ? "#059669" : "#a43131"}` }}>
                <strong>Preview:</strong> {selectedUser.fullName} will have{" "}
                <strong>{selectedUser.trustPoints + Number(amount || 0)}</strong> points after this adjustment.
              </div>
            )}
          </div>
        )}
      </ConfirmDialog>
    </section>
  );
}