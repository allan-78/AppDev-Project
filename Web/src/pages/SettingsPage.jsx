import React, { useState } from "react";
import { RefreshCcw } from "lucide-react";
import { api } from "../api/client";

export default function SettingsPage({ community, onCommunityChange }) {
  const [message, setMessage] = useState("");

  async function regenerate() {
    const data = await api("/communities/mine/regenerate-code", { method: "POST" });
    onCommunityChange(data.community);
    setMessage("Join code regenerated.");
  }

  return (
    <section className="settings-panel">
      <h2>{community?.name || "Community"}</h2>
      <p>{community?.location}</p>
      <div className="join-code">
        <span>Resident Join Code</span>
        <strong>{community?.joinCode}</strong>
        <button onClick={regenerate} title="Regenerate join code"><RefreshCcw size={16} /></button>
      </div>
      <div className="rules-grid">
        <div><span>Starting</span><strong>{community?.trustRules?.startingPoints}</strong></div>
        <div><span>Escrow</span><strong>{community?.trustRules?.escrowPoints}</strong></div>
        <div><span>Late/day</span><strong>{community?.trustRules?.latePenaltyPerDay}</strong></div>
        <div><span>Damage</span><strong>{community?.trustRules?.damagePenalty}</strong></div>
      </div>
      {message && <p className="success">{message}</p>}
    </section>
  );
}
