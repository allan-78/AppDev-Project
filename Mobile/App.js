import React, { useEffect, useState } from "react";
import { SafeAreaView, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { styles } from "./src/styles/styles";
import { api, clearTokens, setTokens } from "./src/api/client";
import LoginScreen from "./src/screens/LoginScreen";
import RegisterScreen from "./src/screens/RegisterScreen";
import HomeScreen from "./src/screens/HomeScreen";
import BrowseToolsScreen from "./src/screens/BrowseToolsScreen";
import AddToolScreen from "./src/screens/AddToolScreen";
import BorrowingsScreen from "./src/screens/BorrowingsScreen";
import TrustWalletScreen from "./src/screens/TrustWalletScreen";
import ProfileScreen from "./src/screens/ProfileScreen";
import CommunityScreen from "./src/screens/CommunityScreen";

const tabs = [
  { key: "home", label: "Home", icon: "home-outline" },
  { key: "browse", label: "Browse", icon: "search-outline" },
  { key: "add", label: "List", icon: "add-circle-outline" },
  { key: "borrowings", label: "Borrow", icon: "calendar-outline" },
  { key: "community", label: "Community", icon: "people-outline" },
  { key: "wallet", label: "Trust", icon: "shield-checkmark-outline" },
  { key: "profile", label: "Profile", icon: "person-outline" }
];

export default function App() {
  const [user, setUser] = useState(null);
  const [booting, setBooting] = useState(true);
  const [authMode, setAuthMode] = useState("login");
  const [tab, setTab] = useState("home");

  useEffect(() => {
    api("/auth/me")
      .then((data) => setUser(data.user))
      .catch(() => clearTokens())
      .finally(() => setBooting(false));
  }, []);

  async function login(email, password) {
    const data = await api("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
    setTokens(data);
    setUser(data.user);
  }

  async function register(payload) {
    await api("/auth/register", { method: "POST", body: JSON.stringify(payload) });
    setAuthMode("login");
  }

  function logout() {
    clearTokens();
    setUser(null);
  }

  if (booting) {
    return <SafeAreaView style={styles.center}><Text>Loading NeighborhoodShare...</Text></SafeAreaView>;
  }

  if (!user) {
    return authMode === "login" ? (
      <LoginScreen onLogin={login} onRegister={() => setAuthMode("register")} />
    ) : (
      <RegisterScreen onSubmit={register} onLogin={() => setAuthMode("login")} />
    );
  }

  if (user.status !== "approved") {
    return (
      <SafeAreaView style={styles.screen}>
        <StatusBar style="dark" />
        <View style={styles.pending}>
          <Ionicons name="time-outline" size={54} color="#9a6a10" />
          <Text style={styles.title}>Approval pending</Text>
          <Text style={styles.muted}>Your registration was received. A community leader must approve your account before you can borrow tools.</Text>
          <TouchableOpacity style={styles.primaryButton} onPress={logout}><Text style={styles.primaryButtonText}>Sign out</Text></TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const screens = {
    home: <HomeScreen user={user} setTab={setTab} />,
    browse: <BrowseToolsScreen />,
    add: <AddToolScreen />,
    borrowings: <BorrowingsScreen />,
    community: <CommunityScreen />,
    wallet: <TrustWalletScreen user={user} />,
    profile: <ProfileScreen user={user} onLogout={logout} />
  };

  return (
    <SafeAreaView style={styles.app}>
      <StatusBar style="dark" />
      <ScrollView style={styles.content} contentContainerStyle={styles.contentInner}>
        {screens[tab]}
      </ScrollView>
      <View style={styles.tabbar}>
        {tabs.map((item) => (
          <TouchableOpacity key={item.key} style={styles.tabItem} onPress={() => setTab(item.key)}>
            <Ionicons name={item.icon} size={21} color={tab === item.key ? "#177a5b" : "#64748b"} />
            <Text style={[styles.tabText, tab === item.key && styles.tabTextActive]}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </SafeAreaView>
  );
}
