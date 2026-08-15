// REWARD ENGINE
// ----------------------------------------------------------------------------
// Thin orchestration layer over services/api for the trophy vault (Hall of
// Ascension), plus a re-export of the display-only stat-gain estimator from
// progressionEngine so anything reward-related has one place to import from.
import { api } from "@/services/api";
export { estimateStatGainForDisplay } from "@/engine/progressionEngine";

export const rewardEngine = {
  listTrophies: () => api.get("/trophies").then(r => r.data),
};
