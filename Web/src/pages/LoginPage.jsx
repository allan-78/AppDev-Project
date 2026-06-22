import React, { useState } from "react";
import { LockKeyhole } from "lucide-react";
import { useAuth } from "../store/authStore";

export default function LoginPage() {
  const { login } = useAuth();
  const [form, setForm] = useState({ email: "admin@neighborhood.test", password: "Password123!" });
  const [error, setError] = useState("");

  async function submit(event) {
    event.preventDefault();
    setError("");
    try {
      await login(form.email, form.password);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <main className="login-page">
      <section className="login-panel">
        <div className="login-mark"><LockKeyhole size={28} /></div>
        <h1>NeighborhoodShare Admin</h1>
        <p>Monitor residents, tools, requests, disputes, and trust points for one verified community.</p>
        <form onSubmit={submit}>
          <label>Email<input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
          <label>Password<input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></label>
          {error && <div className="error">{error}</div>}
          <button type="submit">Sign in</button>
        </form>
      </section>
    </main>
  );
}
