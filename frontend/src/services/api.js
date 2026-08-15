import axios from "axios";
import { safeGet, safeRemove } from "@/state/persistence";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

export const api = axios.create({ baseURL: API });

api.interceptors.request.use((config) => {
  const token = safeGet("axiom_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err?.response?.status === 401) {
      safeRemove("axiom_token");
      if (!window.location.pathname.startsWith("/auth")) window.location.href = "/auth";
    }
    return Promise.reject(err);
  }
);

export const streamArchitect = async (text, onDelta, onDone, onError) => {
  const token = safeGet("axiom_token");
  try {
    const res = await fetch(`${API}/architect/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ text }),
    });
    if (!res.ok || !res.body) { onError?.(new Error("stream failed")); return; }
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split("\n\n");
      buffer = parts.pop();
      for (const part of parts) {
        const line = part.trim();
        if (!line.startsWith("data:")) continue;
        try {
          const payload = JSON.parse(line.slice(5).trim());
          if (payload.delta) onDelta?.(payload.delta);
          if (payload.error) onError?.(new Error(payload.error));
          if (payload.done) onDone?.();
        } catch { /* ignore */ }
      }
    }
    onDone?.();
  } catch (e) { onError?.(e); }
};
