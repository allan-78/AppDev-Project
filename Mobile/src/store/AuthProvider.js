import React, { createContext, useContext, useEffect, useState, useRef } from "react";
import { Alert } from "react-native";
import Constants, { ExecutionEnvironment } from "expo-constants";
import { api, setTokens, clearTokens, getAccessToken, API_URL, registerPushToken, loadStoredTokens } from "../api/client";

const AuthContext = createContext();
const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [booting, setBooting] = useState(true);
  const [notificationsCount, setNotificationsCount] = useState(0);
  const wsRef = useRef(null);

  async function registerDevicePushToken() {
    if (isExpoGo) {
      return;
    }

    try {
      const Notifications = require("expo-notifications");
      const permissions = await Notifications.getPermissionsAsync();
      const finalPermissions = permissions.granted ? permissions : await Notifications.requestPermissionsAsync();
      if (!finalPermissions.granted) return;
      const token = await Notifications.getExpoPushTokenAsync();
      await registerPushToken(token.data);
    } catch (error) {
      console.warn("Push registration skipped", error?.message || error);
    }
  }

  useEffect(() => {
    async function initAuth() {
      try {
        await loadStoredTokens();
        // Only fetch if we actually have an access token
        const token = getAccessToken();
        if (token) {
          const data = await api("/auth/me", { timeout: 8000 });
          setUser(data.user);
        }
      } catch (err) {
        clearTokens();
      } finally {
        setBooting(false);
      }
    }
    initAuth();
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
    const data = await api("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
      timeout: 20000
    });
    setTokens(data);
    setUser(data.user);
    registerDevicePushToken();
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
