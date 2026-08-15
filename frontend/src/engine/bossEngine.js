// BOSS ENGINE
// ----------------------------------------------------------------------------
// Thin orchestration layer over services/api for boss-related calls. Boss
// resistance/phase/defeat logic is entirely server-side; this module just
// gives call sites a stable, named API instead of raw endpoint strings.
import { api } from "@/services/api";

export const bossEngine = {
  list: () => api.get("/bosses").then(r => r.data),
  getDossier: (bossKey) => api.get(`/bosses/${bossKey}/dossier`).then(r => r.data),
  getStrategy: (bossKey) => api.post(`/bosses/${bossKey}/strategy`).then(r => r.data),
};
