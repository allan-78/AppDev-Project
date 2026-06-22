import React, { useEffect, useState } from "react";
import { Ban } from "lucide-react";
import { api } from "../api/client";
import DataTable from "../components/DataTable";

export default function InventoryPage() {
  const [tools, setTools] = useState([]);
  const [filter, setFilter] = useState("");

  async function load() {
    const query = filter ? `?status=${filter}` : "";
    const data = await api(`/tools${query}`);
    setTools(data.tools);
  }

  async function disable(tool) {
    await api(`/tools/${tool._id}`, { method: "DELETE" });
    load();
  }

  useEffect(() => { load().catch(console.error); }, [filter]);

  return (
    <section>
      <div className="toolbar">
        <select value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="">All statuses</option>
          <option value="available">Available</option>
          <option value="reserved">Reserved</option>
          <option value="borrowed">Borrowed</option>
          <option value="maintenance">Maintenance</option>
          <option value="disabled">Disabled</option>
        </select>
      </div>
      <DataTable
        rows={tools}
        columns={[
          { key: "name", label: "Tool" },
          { key: "owner", label: "Owner", render: (t) => t.owner?.fullName || "Unknown" },
          { key: "category", label: "Category", render: (t) => t.category?.name || "Uncategorized" },
          { key: "condition", label: "Condition" },
          { key: "status", label: "Status", render: (t) => <span className={`pill ${t.status}`}>{t.status}</span> },
          { key: "healthScore", label: "Health" },
          { key: "actions", label: "Actions", render: (t) => <button title="Disable unsafe tool" onClick={() => disable(t)}><Ban size={16} /></button> }
        ]}
      />
    </section>
  );
}
