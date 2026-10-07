import axios from "axios";
import Constants from "expo-constants";
import { Platform } from "react-native";
import { getToken, notifySessionExpired, removeToken } from "./auth";

const API_PORT = 8000;

// Picks the right backend address automatically:
// - Web: the browser runs on the same PC as the backend, so use localhost.
// - Phone (Expo Go): reuse the PC address Expo is already serving from,
//   so it never goes stale when your Wi-Fi IP changes.
// - Android emulator fallback: 10.0.2.2 is the emulator's alias for the PC.
function getBaseUrl(): string {
  if (Platform.OS === "web") {
    return `http://localhost:${API_PORT}`;
  }

  const hostUri = Constants.expoConfig?.hostUri;
  const host = hostUri?.split(":")[0];
  if (host) {
    return `http://${host}:${API_PORT}`;
  }

  return Platform.OS === "android"
    ? `http://10.0.2.2:${API_PORT}`
    : `http://localhost:${API_PORT}`;
}

const api = axios.create({
  baseURL: getBaseUrl(),
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use(async (config) => {
  const token = await getToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

let sessionExpiryHandled = false;

api.interceptors.response.use(
  (response) => {
    if (response.config.url?.includes("/users/login")) {
      sessionExpiryHandled = false;
    }

    return response;
  },
  (error: unknown) => {
    if (!axios.isAxiosError(error) || error.response?.status !== 401) {
      return Promise.reject(error);
    }

    const isLoginRequest = error.config?.url?.includes("/users/login") ?? false;
    if (isLoginRequest || sessionExpiryHandled) {
      return Promise.reject(error);
    }

    sessionExpiryHandled = true;
    void removeToken()
      .catch((storageError: unknown) => {
        const message = storageError instanceof Error ? storageError.message : "Unknown storage error";
        console.error("Could not clear the expired session:", message);
      })
      .finally(() => notifySessionExpired());

    return Promise.reject(error);
  },
);

export default api;
