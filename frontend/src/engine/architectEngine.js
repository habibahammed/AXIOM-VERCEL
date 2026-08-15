// ARCHITECT ENGINE
// ----------------------------------------------------------------------------
// Thin orchestration layer over services/api for the Architect AI channel.
// The LLM call and prompt construction remain entirely server-side; this
// module only wraps the streaming call and history fetch that already
// existed in services/api.js under one named, domain-scoped import.
import { api, streamArchitect } from "@/services/api";

export const architectEngine = {
  getHistory: () => api.get("/architect/history").then(r => r.data),
  stream: streamArchitect,
};
