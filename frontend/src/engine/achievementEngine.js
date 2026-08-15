// ACHIEVEMENT ENGINE
// ----------------------------------------------------------------------------
// Thin orchestration layer over services/api for achievements. Award
// evaluation and duplicate-prevention (via $addToSet) live server-side.
import { api } from "@/services/api";

export const achievementEngine = {
  list: () => api.get("/achievements").then(r => r.data),
};
