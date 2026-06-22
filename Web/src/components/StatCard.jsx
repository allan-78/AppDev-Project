import React from "react";

export default function StatCard({ label, value, tone = "blue" }) {
  return (
    <article className={`stat-card ${tone}`}>
      <span>{label}</span>
      <strong>{value ?? "0"}</strong>
    </article>
  );
}
