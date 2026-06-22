import React, { useEffect, useState } from "react";
import { api } from "../api/client";
import StatCard from "../components/StatCard";

export default function DashboardPage() {
  const [stats, setStats] = useState({});

  useEffect(() => {
    api("/admin/dashboard").then(setStats).catch(console.error);
  }, []);

  return (
    <section>
      <div className="stats-grid">
        <StatCard label="Total Tools" value={stats.totalTools} tone="green" />
        <StatCard label="Pending Users" value={stats.pendingUsers} tone="gold" />
        <StatCard label="Active Borrowings" value={stats.activeBorrowings} tone="blue" />
        <StatCard label="Overdue Returns" value={stats.overdue} tone="red" />
        <StatCard label="Open Disputes" value={stats.disputes} tone="red" />
        <StatCard label="Maintenance Cases" value={stats.maintenanceCases} tone="teal" />
      </div>
      <div className="section-band">
        <h2>Admin Focus</h2>
        <p>Prioritize pending residents, overdue tools, open disputes, and tools with low health scores.</p>
      </div>
    </section>
  );
}
