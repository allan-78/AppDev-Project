import React, { useEffect, useState } from "react";
import { Activity, AlertTriangle, ClipboardList, Gauge, Hammer, Home, LogOut, Settings, ShieldCheck, Users, Wrench } from "lucide-react";
import { api } from "../api/client";
import { useAuth } from "../store/authStore";
import LoginPage from "../pages/LoginPage";
import DashboardPage from "../pages/DashboardPage";
import UsersPage from "../pages/UsersPage";
import InventoryPage from "../pages/InventoryPage";
import BorrowingPage from "../pages/BorrowingPage";
import DisputesPage from "../pages/DisputesPage";
import MaintenancePage from "../pages/MaintenancePage";
import ReportsPage from "../pages/ReportsPage";
import SettingsPage from "../pages/SettingsPage";

const nav = [
  { key: "dashboard", label: "Dashboard", icon: Gauge },
  { key: "users", label: "Users", icon: Users },
  { key: "inventory", label: "Inventory", icon: Wrench },
  { key: "borrowing", label: "Borrowing", icon: ClipboardList },
  { key: "disputes", label: "Disputes", icon: AlertTriangle },
  { key: "maintenance", label: "Maintenance", icon: Hammer },
  { key: "reports", label: "Reports", icon: Activity },
  { key: "settings", label: "Settings", icon: Settings }
];

export default function App() {
  const { user, loading, logout } = useAuth();
  const [page, setPage] = useState("dashboard");
  const [community, setCommunity] = useState(null);

  useEffect(() => {
    if (user?.role === "admin" || user?.role === "superAdmin") {
      api("/communities/mine").then((data) => setCommunity(data.community)).catch(() => {});
    }
  }, [user]);

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

  const pages = {
    dashboard: <DashboardPage />,
    users: <UsersPage />,
    inventory: <InventoryPage />,
    borrowing: <BorrowingPage />,
    disputes: <DisputesPage />,
    maintenance: <MaintenancePage />,
    reports: <ReportsPage />,
    settings: <SettingsPage community={community} onCommunityChange={setCommunity} />
  };

  return (
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
              <button key={item.key} className={page === item.key ? "active" : ""} onClick={() => setPage(item.key)} title={item.label}>
                <Icon size={18} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
        <button className="logout" onClick={logout}>
          <LogOut size={18} />
          <span>Sign out</span>
        </button>
      </aside>
      <main className="content">
        <header className="topbar">
          <div>
            <p>Community leader workspace</p>
            <h1>{nav.find((item) => item.key === page)?.label}</h1>
          </div>
          <div className="admin-chip">{user.fullName}</div>
        </header>
        {pages[page]}
      </main>
    </div>
  );
}
