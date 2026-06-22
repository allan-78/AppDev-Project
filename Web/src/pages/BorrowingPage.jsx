import React, { useEffect, useState } from "react";
import { Check, X } from "lucide-react";
import { api } from "../api/client";
import DataTable from "../components/DataTable";

export default function BorrowingPage() {
  const [requests, setRequests] = useState([]);

  async function load() {
    const data = await api("/borrow-requests");
    setRequests(data.requests);
  }

  async function decide(row, decision) {
    await api(`/borrow-requests/${row._id}/decision`, { method: "PATCH", body: JSON.stringify({ decision }) });
    load();
  }

  useEffect(() => { load().catch(console.error); }, []);

  return (
    <section>
      <DataTable
        rows={requests}
        columns={[
          { key: "tool", label: "Tool", render: (r) => r.tool?.name },
          { key: "borrower", label: "Borrower", render: (r) => r.borrower?.fullName },
          { key: "owner", label: "Owner", render: (r) => r.owner?.fullName },
          { key: "status", label: "Status", render: (r) => <span className={`pill ${r.status}`}>{r.status}</span> },
          { key: "priorityScore", label: "Priority" },
          { key: "escrowPoints", label: "Escrow" },
          {
            key: "actions",
            label: "Actions",
            render: (r) => r.status === "requested" ? (
              <div className="row-actions">
                <button title="Approve" onClick={() => decide(r, "approved")}><Check size={16} /></button>
                <button title="Reject" onClick={() => decide(r, "rejected")}><X size={16} /></button>
              </div>
            ) : "Reviewed"
          }
        ]}
      />
    </section>
  );
}
