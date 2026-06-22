import React, { useEffect, useState } from "react";
import { api } from "../api/client";
import DataTable from "../components/DataTable";

export default function MaintenancePage() {
  const [cases, setCases] = useState([]);
  const [tools, setTools] = useState([]);
  const [form, setForm] = useState({ tool: "", issue: "", estimatedPointCost: 50 });

  async function load() {
    const [maintenanceData, toolData] = await Promise.all([api("/maintenance"), api("/tools")]);
    setCases(maintenanceData.cases);
    setTools(toolData.tools);
    if (!form.tool && toolData.tools[0]) setForm((current) => ({ ...current, tool: toolData.tools[0]._id }));
  }

  async function submit(event) {
    event.preventDefault();
    await api("/maintenance", { method: "POST", body: JSON.stringify(form) });
    setForm({ ...form, issue: "" });
    load();
  }

  useEffect(() => { load().catch(console.error); }, []);

  return (
    <section>
      <form className="inline-form" onSubmit={submit}>
        <select value={form.tool} onChange={(e) => setForm({ ...form, tool: e.target.value })}>
          {tools.map((tool) => <option key={tool._id} value={tool._id}>{tool.name}</option>)}
        </select>
        <input placeholder="Maintenance issue" value={form.issue} onChange={(e) => setForm({ ...form, issue: e.target.value })} />
        <input type="number" value={form.estimatedPointCost} onChange={(e) => setForm({ ...form, estimatedPointCost: Number(e.target.value) })} />
        <button>Create Allocation</button>
      </form>
      <DataTable
        rows={cases}
        columns={[
          { key: "tool", label: "Tool", render: (c) => c.tool?.name },
          { key: "issue", label: "Issue" },
          { key: "estimatedPointCost", label: "Point Cost" },
          { key: "allocations", label: "Split", render: (c) => c.allocations?.map((a) => `${a.user?.fullName}: ${a.pointShare}`).join(", ") || "No borrowers" },
          { key: "status", label: "Status", render: (c) => <span className={`pill ${c.status}`}>{c.status}</span> }
        ]}
      />
    </section>
  );
}
