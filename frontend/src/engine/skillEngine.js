// SKILL ENGINE
// ----------------------------------------------------------------------------
// Thin orchestration layer over services/api for the skill tree. Node
// unlock/mastery thresholds are server-computed; this module just names
// the call.
import { api } from "@/services/api";

export const skillEngine = {
  list: () => api.get("/skills").then(r => r.data),
};
