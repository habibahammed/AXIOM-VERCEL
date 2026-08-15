// QUEST ENGINE
// ----------------------------------------------------------------------------
// A thin, named orchestration layer over services/api for quest-related
// calls. This is intentionally NOT where quest logic lives — creation
// validation, completion rules, XP/level/rank calculation, and duplicate-
// completion protection all remain server-side (backend/server.py), which
// is the correct architecture for anything that affects real progression.
// What this module gives the rest of the app is one stable, readable
// import (`questEngine.complete(id)`) instead of raw endpoint strings
// scattered across view components.
import { api } from "@/services/api";

export const questEngine = {
  list: () => api.get("/quests").then(r => r.data),
  create: (data) => api.post("/quests", data).then(r => r.data),
  complete: (id) => api.post(`/quests/${id}/complete`, {}).then(r => r.data),
};
