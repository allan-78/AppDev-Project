import React, { useEffect, useState } from "react";
import { api } from "../api/client";

function ListBlock({ title, items, render }) {
  return (
    <article className="report-block">
      <h2>{title}</h2>
      {items?.length ? items.map(render) : <p>No data yet.</p>}
    </article>
  );
}

export default function ReportsPage() {
  const [reports, setReports] = useState({});

  useEffect(() => { api("/reports").then(setReports).catch(console.error); }, []);

  return (
    <section className="reports-grid">
      <ListBlock title="Most Borrowed Tools" items={reports.mostBorrowedTools} render={(t) => <p key={t._id}>{t.name} · {t.borrowCount} borrows</p>} />
      <ListBlock title="Top Lenders" items={reports.topLenders} render={(u) => <p key={u._id}>{u.fullName} · {u.trustPoints} points</p>} />
      <ListBlock title="Highest Risk Borrowers" items={reports.highestRiskBorrowers} render={(u) => <p key={u._id}>{u.fullName} · {u.trustPoints} points</p>} />
      <ListBlock title="Tools Needing Replacement" items={reports.toolsNeedingReplacement} render={(t) => <p key={t._id}>{t.name} · health {t.healthScore}</p>} />
    </section>
  );
}
