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

    // 403 means authenticated but not permitted. Without this the backend's
    // AccessDeniedException message surfaces raw, or as a blank failure, which reads
    // as a bug rather than as a permission boundary.
    if (error?.response?.status === 403) {
      return Promise.reject(
        new Error(
          error?.response?.data?.message ??
            "You do not have permission to perform this action."
        )
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
