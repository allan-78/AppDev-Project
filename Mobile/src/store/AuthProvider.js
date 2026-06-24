import React, { createContext, useContext, useEffect, useState, useRef } from "react";
import { Alert } from "react-native";
import { api, setTokens, clearTokens, getAccessToken, API_URL } from "../api/client";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [booting, setBooting] = useState(true);
  const [notificationsCount, setNotificationsCount] = useState(0);
  const wsRef = useRef(null);

  useEffect(() => {
    api("/auth/me")
      .then((data) => setUser(data.user))
      .catch(() => clearTokens())
      .finally(() => setBooting(false));
  }, []);

  // open websocket for realtime notifications when authenticated
  useEffect(() => {
    const token = getAccessToken();
    if (!token) return;
    const base = API_URL.replace(/\/api$/, "");
    try {
      const ws = new WebSocket(`${base}/ws?token=${token}`);
      wsRef.current = ws;
      ws.onmessage = (evt) => {
        try {
          const msg = JSON.parse(evt.data);
          if (msg.type === "notification") {
            const payload = msg.payload || {};
            setNotificationsCount((c) => c + 1);
            Alert.alert(payload.title || "Notification", payload.message || "");
          }
        } catch (e) { }
      };
      ws.onclose = () => { wsRef.current = null; };
    } catch (e) { }
    return () => { if (wsRef.current) wsRef.current.close(); };
  }, [user]);

  async function login(email, password) {
    const data = await api("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
    setTokens(data);
    setUser(data.user);
    return data.user;
  }

  async function register(payload) {
    await api("/auth/register", { method: "POST", body: JSON.stringify(payload) });
  }

  async function refreshProfile() {
    try {
      const data = await api("/users/profile");
      setUser(data.user);
      return data.user;
    } catch (err) {
      return null;
    }
  }

  function logout() {
    clearTokens();
    setUser(null);
    if (wsRef.current) wsRef.current.close();
  }

  return (
    <AuthContext.Provider value={{ user, booting, login, register, refreshProfile, logout, notificationsCount }}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

export default AuthProvider;
