import React, { useEffect, useState } from "react";
import { Check, Pause, X } from "lucide-react";
import { api } from "../api/client";
import DataTable from "../components/DataTable";

export default function UsersPage() {
  const [users, setUsers] = useState([]);

  async function load() {
    const data = await api("/admin/users");
    setUsers(data.users);
  }

  async function setStatus(user, status) {
    await api(`/admin/users/${user._id}/status`, { method: "PATCH", body: JSON.stringify({ status }) });
    load();
  }

  useEffect(() => { load().catch(console.error); }, []);

  return (
    <section>
      <DataTable
        rows={users}
        columns={[
          { key: "fullName", label: "Resident" },
          { key: "email", label: "Email" },
          { key: "status", label: "Status", render: (u) => <span className={`pill ${u.status}`}>{u.status}</span> },
          { key: "trustPoints", label: "Trust" },
          { key: "lockedPoints", label: "Locked" },
          {
            key: "actions",
            label: "Actions",
            render: (u) => (
              <div className="row-actions">
                <button title="Approve" onClick={() => setStatus(u, "approved")}><Check size={16} /></button>
                <button title="Suspend" onClick={() => setStatus(u, "suspended")}><Pause size={16} /></button>
                <button title="Reject" onClick={() => setStatus(u, "rejected")}><X size={16} /></button>
              </div>
            )
          }
        ]}
      />
    </section>
  );
}
