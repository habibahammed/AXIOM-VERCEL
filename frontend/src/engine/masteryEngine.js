// MASTERY ENGINE
// ----------------------------------------------------------------------------
// Thin orchestration layer over services/api for Monarch Trials — the
// closest existing concept to "mastery challenges" in AXIOM today. Pass/fail
// evaluation and reward calculation remain server-side.
import { api } from "@/services/api";

export const masteryEngine = {
  listTrials: () => api.get("/trials").then(r => r.data),
  attemptTrial: (id) => api.post(`/trials/${id}/attempt`).then(r => r.data),
};
