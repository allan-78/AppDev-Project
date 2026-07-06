const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

let accessToken = localStorage.getItem("ns_access_token") || "";
let refreshToken = localStorage.getItem("ns_refresh_token") || "";

let isRefreshing = false;
let refreshSubscribers = [];

function subscribeTokenRefresh(cb) {
  refreshSubscribers.push(cb);
}

function onRefreshed(token) {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
}

export function setTokens(tokens) {
  accessToken = tokens.accessToken || "";
  if (tokens.refreshToken) refreshToken = tokens.refreshToken;
  if (accessToken) localStorage.setItem("ns_access_token", accessToken);
  if (tokens.refreshToken) localStorage.setItem("ns_refresh_token", refreshToken);
}

export function clearTokens() {
  accessToken = "";
  refreshToken = "";
  localStorage.removeItem("ns_access_token");
  localStorage.removeItem("ns_refresh_token");
}

export async function refreshAccessToken() {
  if (!refreshToken) throw new Error("No refresh token available");
  const response = await fetch(`${API_URL}/auth/refresh`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ refreshToken })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || "Failed to refresh token");
  }
  setTokens({ accessToken: data.accessToken });
  return data.accessToken;
}

export async function api(path, options = {}) {
  const fetchUrl = `${API_URL}${path}`;
  const getHeaders = (token) => ({
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers
  });

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

  let response = await fetch(fetchUrl, {
    ...options,
    headers: getHeaders(accessToken),
    signal: controller.signal
  });

  clearTimeout(timeoutId);

  if (response.status === 401 && refreshToken && path !== "/auth/login" && path !== "/auth/refresh") {
    if (!isRefreshing) {
      isRefreshing = true;
      try {
        const newAccessToken = await refreshAccessToken();
        isRefreshing = false;
        onRefreshed(newAccessToken);
      } catch (err) {
        isRefreshing = false;
        clearTokens();
        window.dispatchEvent(new CustomEvent("auth-logout"));
        throw new Error("Session expired. Please log in again.");
      }
    }

    const retryPromise = new Promise((resolve) => {
      subscribeTokenRefresh((token) => {
        resolve(
          fetch(fetchUrl, {
            ...options,
            headers: getHeaders(token)
          })
        );
      });
    });

    response = await retryPromise;
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || "Request failed");
  return data;
}

export async function downloadFile(path, filename) {
  let headers = {
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {})
  };
  
  let response = await fetch(`${API_URL}${path}`, { headers });
  
  if (response.status === 401 && refreshToken) {
    try {
      const newToken = await refreshAccessToken();
      headers.Authorization = `Bearer ${newToken}`;
      response = await fetch(`${API_URL}${path}`, { headers });
    } catch (e) {
      clearTokens();
      window.dispatchEvent(new CustomEvent("auth-logout"));
      throw e;
    }
  }

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.message || "Download failed");
  }
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export const authApi = {
  login: (payload) => api("/auth/login", { method: "POST", body: JSON.stringify(payload) }),
  me: () => api("/auth/me")
};

export { API_URL };
