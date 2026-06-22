const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:5000/api";

let accessToken = "";
let refreshToken = "";

export function setTokens(tokens) {
  accessToken = tokens.accessToken || "";
  refreshToken = tokens.refreshToken || "";
}

export function clearTokens() {
  accessToken = "";
  refreshToken = "";
}

export function getAccessToken() {
  return accessToken;
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

export async function uploadImage(asset) {
  const form = new FormData();
  const name = asset.fileName || `photo-${Date.now()}.jpg`;
  const type = asset.mimeType || "image/jpeg";
  form.append("image", { uri: asset.uri, name, type });

  const response = await fetch(`${API_URL}/uploads/image`, {
    method: "POST",
    headers: {
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {})
    },
    body: form
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || "Image upload failed");
  return data;
}

export { API_URL };
