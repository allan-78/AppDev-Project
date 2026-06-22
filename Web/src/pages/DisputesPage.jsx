import React, { useEffect, useState } from "react";
import { api } from "../api/client";
import DataTable from "../components/DataTable";

export default function DisputesPage() {
  const [disputes, setDisputes] = useState([]);

  async function load() {
    const data = await api("/disputes");
    setDisputes(data.disputes);
  }

  async function resolve(row) {
    const penaltyPoints = window.prompt("Penalty points", "10");
    const resolution = window.prompt("Resolution note", "Resolved by community leader.");
    await api(`/disputes/${row._id}/resolve`, {
      method: "PATCH",
      body: JSON.stringify({ penaltyPoints: Number(penaltyPoints || 0), resolution, status: "resolved" })
    });
    load();
  }

  useEffect(() => { load().catch(console.error); }, []);

  return (
    <section>
      <DataTable
        rows={disputes}
        columns={[
          { key: "tool", label: "Tool", render: (d) => d.tool?.name },
          { key: "type", label: "Type" },
          { key: "reportedBy", label: "Reported By", render: (d) => d.reportedBy?.fullName },
          { key: "againstUser", label: "Against", render: (d) => d.againstUser?.fullName || "N/A" },
          { key: "status", label: "Status", render: (d) => <span className={`pill ${d.status}`}>{d.status}</span> },
          { key: "actions", label: "Actions", render: (d) => <button onClick={() => resolve(d)}>Resolve</button> }
        ]}
      />
    </section>
  );
}
