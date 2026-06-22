const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

let accessToken = localStorage.getItem("ns_access_token") || "";
let refreshToken = localStorage.getItem("ns_refresh_token") || "";

export function setTokens(tokens) {
  accessToken = tokens.accessToken || "";
  refreshToken = tokens.refreshToken || "";
  if (accessToken) localStorage.setItem("ns_access_token", accessToken);
  if (refreshToken) localStorage.setItem("ns_refresh_token", refreshToken);
}

export function clearTokens() {
  accessToken = "";
  refreshToken = "";
  localStorage.removeItem("ns_access_token");
  localStorage.removeItem("ns_refresh_token");
}

export async function api(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...options.headers
    }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || "Request failed");
  return data;
}

export const authApi = {
  login: (payload) => api("/auth/login", { method: "POST", body: JSON.stringify(payload) }),
  me: () => api("/auth/me")
};

export { API_URL };
