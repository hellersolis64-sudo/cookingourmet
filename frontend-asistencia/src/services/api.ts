import axios from "axios";

const RAW_BASE = String(
  import.meta.env.VITE_API_URL ?? "http://localhost/control-asistencia/public"
).replace(/\/$/, "");

// ✅ asegura /api aunque el env no lo traiga
const API_BASE_URL = RAW_BASE.endsWith("/api") ? RAW_BASE : `${RAW_BASE}/api`;

const TOKEN_KEY = "token";
const USER_KEY = "user";

function clearAuthStorage() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  config.headers = config.headers ?? {};
  const token = localStorage.getItem(TOKEN_KEY);

  if (token) config.headers.Authorization = `Bearer ${token}`;
  else delete config.headers.Authorization;

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;

    if (status === 401) {
      clearAuthStorage();
      if (window.location.pathname !== "/login") window.location.href = "/login";
    }

    return Promise.reject(error);
  }
);
