import axios from "axios";

const rawApiBaseUrl =
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:8080";

export const API_BASE_URL = rawApiBaseUrl.replace(/\/+$/, "").replace(/\/api$/, "");

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 15000,
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error?.response?.data?.message ??
      error?.response?.data?.error ??
      (!error?.response && error?.request
        ? `Unable to reach backend at ${API_BASE_URL}. Please make sure the backend server is running.`
        : undefined) ??
      error?.message ??
      "Request failed";

    return Promise.reject(new Error(message));
  }
);
