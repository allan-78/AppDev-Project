import { Platform } from "react-native";
import Constants from "expo-constants";
import * as SecureStore from "expo-secure-store";

const DEFAULT_API_URL = "http://localhost:5000/api";
const ANDROID_EMULATOR_API_URL = "http://10.0.2.2:5000/api";
const IOS_SIMULATOR_API_URL = "http://localhost:5000/api";

function getExpoHostApiUrl() {
  const expoConfig = Constants.expoConfig || Constants.manifest;
  const hostUri = expoConfig?.hostUri || expoConfig?.debuggerHost || expoConfig?.packagerOpts?.packagerHost;
  if (!hostUri) return null;
  const host = hostUri.split(":")[0];
  if (!host || host === "localhost" || host === "127.0.0.1") return null;
  return `http://${host}:5000/api`;
}

const API_URL = process.env.EXPO_PUBLIC_API_URL || getExpoHostApiUrl() || (Platform.OS === "android" ? ANDROID_EMULATOR_API_URL : Platform.OS === "ios" ? IOS_SIMULATOR_API_URL : DEFAULT_API_URL);
const API_ORIGIN = API_URL.replace(/\/api\/?$/, "");

let accessToken = "";
let refreshToken = "";

export async function loadStoredTokens() {
  try {
    accessToken = await SecureStore.getItemAsync("accessToken") || "";
    refreshToken = await SecureStore.getItemAsync("refreshToken") || "";
  } catch (e) {
    accessToken = "";
    refreshToken = "";
  }
}

export function setTokens(tokens) {
  accessToken = tokens.accessToken || "";
  refreshToken = tokens.refreshToken || "";
  SecureStore.setItemAsync("accessToken", accessToken).catch(() => {});
  SecureStore.setItemAsync("refreshToken", refreshToken).catch(() => {});
}

export function clearTokens() {
  accessToken = "";
  refreshToken = "";
  SecureStore.deleteItemAsync("accessToken").catch(() => {});
  SecureStore.deleteItemAsync("refreshToken").catch(() => {});
}

export function getAccessToken() {
  return accessToken;
}

async function fetchWithTimeout(resource, options = {}, timeout = 30000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(resource, { ...options, signal: controller.signal });
    return response;
  } catch (err) {
    if (err.name === "AbortError") {
      console.error(`Request timed out after ${timeout}ms:`, resource);
      throw new Error(`Request timed out after ${timeout / 1000}s. Check your network or server connection.`);
    }
    console.error("Network error:", err);
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

export async function api(path, options = {}) {
  const { timeout, ...fetchOptions } = options;
  const response = await fetchWithTimeout(`${API_URL}${path}`, {
    ...fetchOptions,
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...fetchOptions.headers
    }
  }, timeout ?? 15000);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || "Request failed");
  return data;
}

export async function uploadImage(asset) {
  return uploadMedia(asset);
}

export async function uploadMedia(asset) {
  const form = new FormData();
  const name = asset.fileName || `photo-${Date.now()}.jpg`;
  const type = asset.mimeType || "image/jpeg";
  form.append("media", { uri: asset.uri, name, type });

  const response = await fetchWithTimeout(`${API_URL}/uploads/media`, {
    method: "POST",
    headers: {
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {})
    },
    body: form
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || "Media upload failed");
  return data;
}

export async function registerPushToken(token, platform = Platform.OS || "unknown") {
  if (!token) return null;
  return api("/notifications/push-token", { method: "POST", body: JSON.stringify({ token, platform }) });
}

export { API_URL };

export function resolveUrl(url) {
  if (!url) return url;
  try {
    if (url.startsWith("http")) {
      if (Platform.OS === "android" && url.includes("localhost")) {
        return url.replace("localhost", "10.0.2.2");
      }
      return url;
    }
    if (url.startsWith("/")) return `${API_ORIGIN}${url}`;
    return `${API_ORIGIN}/${url}`;
  } catch (e) {
    return url;
  }
}
