import axios from "axios";

export const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

const client = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
});

client.interceptors.request.use((config) => {
  const token = localStorage.getItem("aegispam_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("aegispam_token");
      if (!window.location.pathname.startsWith("/login")) {
        window.location.href = "/login";
      }
    }
    return Promise.reject(normalizeError(error));
  }
);

/** Turns FastAPI's {detail: "..."} or {detail: [{field, message}]} into a
 * flat, human-readable string plus a per-field map for form errors. */
export function normalizeError(error) {
  const detail = error.response?.data?.detail;
  if (Array.isArray(detail)) {
    const fieldErrors = {};
    detail.forEach((d) => {
      fieldErrors[d.field || "_"] = d.message;
    });
    return {
      message: detail.map((d) => d.message).join(" "),
      fieldErrors,
      status: error.response?.status,
    };
  }
  if (typeof detail === "string") {
    return { message: detail, fieldErrors: {}, status: error.response?.status };
  }
  if (error.code === "ECONNABORTED") {
    return { message: "The request timed out. Please try again.", fieldErrors: {}, status: null };
  }
  if (!error.response) {
    return {
      message: "Could not reach the AegisPAM API. Is the backend running?",
      fieldErrors: {},
      status: null,
    };
  }
  return { message: "Something went wrong. Please try again.", fieldErrors: {}, status: error.response?.status };
}

export default client;
