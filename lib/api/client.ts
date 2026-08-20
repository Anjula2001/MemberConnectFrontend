import axios from "axios";

export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080",
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 15000,
});

// Auto-attach JWT token to every request
apiClient.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("auth_token");
    if (token) {
      config.headers["Authorization"] = `Bearer ${token}`;
    }
  }

  // File uploads must carry their own multipart boundary, and the browser only
  // generates one when the Content-Type header is absent. The instance-wide
  // application/json default above would otherwise survive onto a FormData body
  // and the server would reject the request as "Current request is not a
  // multipart request". Clearing it here lets axios set the correct type per
  // request, and keeps every upload in the app on one rule rather than each
  // caller remembering to override the header itself.
  if (typeof FormData !== "undefined" && config.data instanceof FormData) {
    config.headers.delete("Content-Type");
  }

  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // If 401 Unauthorized, clear auth and redirect to login
    if (error?.response?.status === 401 && typeof window !== "undefined") {
      localStorage.removeItem("auth_token");
      localStorage.removeItem("auth_user");
      window.location.href = "/login";
    }

    // 403 means authenticated but not permitted — the opposite of 401, so it must not
    // log the user out. Give it a readable message: the backend sends a raw permission
    // name ("Missing permission: G5_LIST_PROCESS"), which is not for end users.
    if (error?.response?.status === 403) {
      return Promise.reject(
        new Error("You do not have permission to perform this action.")
      );
    }

    const message =
      error?.response?.data?.message ??
      error?.response?.data?.error ??
      error?.message ??
      "Request failed";

    return Promise.reject(new Error(message));
  }
);

export default apiClient;
