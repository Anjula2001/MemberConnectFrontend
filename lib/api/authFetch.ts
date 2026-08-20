/**
 * fetch() with the logged-in user's JWT attached.
 *
 * The Scholarship screens (University + Grade 5) predate the auth layer and talk to
 * the API with raw fetch(). Once SecurityConfig moved to `.anyRequest().authenticated()`
 * every one of those calls started coming back 403 — the same status Spring returns for
 * a genuine permission denial, which is why it reads as "this role is not allowed"
 * rather than "no credentials were sent".
 *
 * Deliberately a thin wrapper rather than a port to apiClient: it keeps the existing
 * call sites, their Response handling and their FormData uploads exactly as they are.
 * Content-Type is never set here, so multipart uploads keep their generated boundary.
 */
export async function authFetch(
  input: RequestInfo | URL,
  init: RequestInit = {}
): Promise<Response> {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;

  const headers = new Headers(init.headers);
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  return fetch(input, { ...init, headers });
}

export default authFetch;
