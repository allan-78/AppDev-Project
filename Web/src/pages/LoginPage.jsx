import React, { useState } from "react";
import { LockKeyhole } from "lucide-react";
import { useAuth } from "../store/authStore";

export default function LoginPage() {
  const { login } = useAuth();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await login(form.email, form.password);
    } catch (err) {
      setError(err.message || "Login failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="login-page">
      <section className="login-panel">
        <div className="login-mark"><LockKeyhole size={28} /></div>
        <h1>NeighborhoodShare Admin</h1>
        <p>Monitor residents, tools, requests, disputes, and trust points for one verified community.</p>
        <form onSubmit={submit}>
          <label>
            Email
            <input 
              value={form.email} 
              onChange={(e) => setForm({ ...form, email: e.target.value })} 
              disabled={submitting}
              required
            />
          </label>
          <label>
            Password
            <input 
              type="password" 
              value={form.password} 
              onChange={(e) => setForm({ ...form, password: e.target.value })} 
              disabled={submitting}
              required
            />
          </label>
          {error && <div className="error">{error}</div>}
          <button type="submit" disabled={submitting}>
            {submitting ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </section>
    </main>
  );
}
