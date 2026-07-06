import React, { useEffect, useState } from "react";
import { Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import { Activity, AlertTriangle, ClipboardList, Gauge, Hammer, Home, LogOut, MessageSquare, Moon, Settings, ShieldCheck, Sun, Users, Wrench } from "lucide-react";
import { api } from "../api/client";
import { useAuth } from "../store/authStore";
import { ToastProvider } from "../components/Toast";
import LoginPage from "../pages/LoginPage";
import DashboardPage from "../pages/DashboardPage";
import UsersPage from "../pages/UsersPage";
import InventoryPage from "../pages/InventoryPage";
import BorrowingPage from "../pages/BorrowingPage";
import DisputesPage from "../pages/DisputesPage";
import MaintenancePage from "../pages/MaintenancePage";
import ReportsPage from "../pages/ReportsPage";
import SettingsPage from "../pages/SettingsPage";
import CommunitiesPage from "../pages/CommunitiesPage";
import TrustManagementPage from "../pages/TrustManagementPage";
import ActivityLogPage from "../pages/ActivityLogPage";
import MaintenanceDashboardPage from "../pages/MaintenanceDashboardPage";

const nav = [
  { key: "dashboard", label: "Dashboard", icon: Gauge },
  { key: "users", label: "Users", icon: Users },
  { key: "inventory", label: "Inventory", icon: Wrench },
  { key: "communities", label: "Communities", icon: MessageSquare },
  { key: "borrowing", label: "Borrowing", icon: ClipboardList },
  { key: "disputes", label: "Disputes", icon: AlertTriangle },
  { key: "maintenance", label: "Maintenance", icon: Hammer },
  { key: "reports", label: "Reports", icon: Activity },
  { key: "settings", label: "Settings", icon: Settings }
];

export default function App() {
  const { user, loading, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [community, setCommunity] = useState(null);
  const [darkMode, setDarkMode] = useState(false);

  // Extract page key from URL path
  const currentPage = location.pathname.substring(1) || "dashboard";

  useEffect(() => {
    if (user?.role === "admin" || user?.role === "superAdmin") {
      api("/communities/mine").then((data) => setCommunity(data.community)).catch(() => {});
    }
  }, [user]);

  useEffect(() => {
    document.body.className = darkMode ? "dark" : "light";
  }, [darkMode]);

  if (loading) return <div className="center-screen">Loading NeighborhoodShare...</div>;
  if (!user) return <LoginPage />;
  
  if (!["admin", "superAdmin"].includes(user.role)) {
    return (
      <main className="limited-page">
        <ShieldCheck size={44} />
        <h1>{user.fullName}</h1>
        <p>Your account is active for the resident mobile app. Admin tools are available only to community leaders.</p>
        <button onClick={logout}>Sign out</button>
      </main>
    );
  }

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  return (
    <ToastProvider>
      <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <Home size={24} />
          <div>
            <strong>NeighborhoodShare</strong>
            <span>{community?.name || "Admin Panel"}</span>
          </div>
        </div>
        <nav>
          {nav.map((item) => {
            const Icon = item.icon;
            return (
              <button 
                key={item.key} 
                className={currentPage === item.key ? "active" : ""} 
                onClick={() => navigate(`/${item.key}`)} 
                title={item.label}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
        <div className="theme-toggle">
          <button onClick={toggleDarkMode} title={`Switch to ${darkMode ? "light" : "dark"} mode`}>
            {darkMode ? <Sun size={18} /> : <Moon size={18} />}
            <span>{darkMode ? "Light Mode" : "Dark Mode"}</span>
          </button>
        </div>
        <button className="logout" onClick={logout}>
          <LogOut size={18} />
          <span>Sign out</span>
        </button>
      </aside>
      <main className="content">
        <header className="topbar">
          <div>
            <p>Community leader workspace</p>
            <h1>{nav.find((item) => item.key === currentPage)?.label || "Workspace"}</h1>
          </div>
          <div className="admin-chip">{user.fullName}</div>
        </header>
        
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/users" element={<UsersPage />} />
          <Route path="/inventory" element={<InventoryPage />} />
          <Route path="/communities" element={<CommunitiesPage />} />
          <Route path="/borrowing" element={<BorrowingPage />} />
          <Route path="/disputes" element={<DisputesPage />} />
          <Route path="/maintenance" element={<MaintenancePage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/trust-management" element={<TrustManagementPage />} />
          <Route path="/activity-log" element={<ActivityLogPage />} />
          <Route path="/maintenance-dashboard" element={<MaintenanceDashboardPage />} />
          <Route path="/settings" element={<SettingsPage community={community} onCommunityChange={setCommunity} />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </main>
    </div>
    </ToastProvider>
  );
}
