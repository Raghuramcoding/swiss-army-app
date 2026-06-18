const API_URL = import.meta.env.VITE_API_URL || "";
const TOKEN_KEY = "workbench.authToken";

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}
export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}
export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

async function request(path, { method = "GET", body } = {}) {
  const token = getToken();
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Something went wrong talking to the server.");
  return data;
}

export const api = {
  signup: (email, password) => request("/auth/signup", { method: "POST", body: { email, password } }),
  login: (email, password) => request("/auth/login", { method: "POST", body: { email, password } }),
  me: () => request("/auth/me"),
  subscribe: (paymentMethodId) => request("/billing/subscribe", { method: "POST", body: { paymentMethodId } }),
  cancel: () => request("/billing/cancel", { method: "POST" }),
  complete: (prompt, system, tool) => request("/ai/complete", { method: "POST", body: { prompt, system, tool } }),
};
