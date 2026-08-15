import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api } from "@/services/api";
import { deriveEventTypes } from "@/engine/eventEngine";
import { safeGet, safeSet, safeRemove } from "@/state/persistence";

const PlayerCtx = createContext(null);

export const PlayerProvider = ({ children }) => {
  const [player, setPlayer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [event, setEvent] = useState(null); // cinematic queue
  const [bossReveal, setBossReveal] = useState(null); // full-screen boss reveal

  const refresh = useCallback(async () => {
    const token = safeGet("axiom_token");
    if (!token) { setPlayer(null); setLoading(false); return; }
    try {
      const { data } = await api.get("/player/me");
      setPlayer(data);
    } catch (e) {
      setPlayer(null);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const login = useCallback(async (email, password) => {
    const { data } = await api.post("/auth/login", { email, password });
    safeSet("axiom_token", data.token);
    await refresh();
  }, [refresh]);

  const register = useCallback(async (email, password, display_name) => {
    const { data } = await api.post("/auth/register", { email, password, display_name });
    safeSet("axiom_token", data.token);
    await refresh();
  }, [refresh]);

  const logout = useCallback(() => {
    safeRemove("axiom_token");
    setPlayer(null);
    window.location.href = "/auth";
  }, []);

  // Perf: PlayerProvider wraps the entire authenticated app, and this state
  // (player/loading/event/bossReveal) changes frequently — every XP tick,
  // every cinematic trigger/clear. Previously the context `value` was a new
  // object literal every render (with functions redefined every render
  // too), so every one of those changes re-rendered every single consumer
  // of usePlayer() app-wide, whether or not they read the field that
  // actually changed. useCallback + useMemo below make the value reference
  // stable unless something it actually depends on changed.
  const triggerEvent = useCallback((e) => {
    // if first hit, queue boss reveal ahead of standard cinematic
    if (e?.first_hit && e?.boss_result) setBossReveal(e.boss_result);
    // Additive labeling only — every existing field on `e` is untouched,
    // so all current consumers (CinematicOverlay, AxiomShell, etc.) keep
    // working exactly as before. New code can read `e.types` instead.
    setEvent(e ? { ...e, types: deriveEventTypes(e) } : e);
  }, []);
  const clearEvent = useCallback(() => setEvent(null), []);
  const clearBossReveal = useCallback(() => setBossReveal(null), []);

  const value = useMemo(
    () => ({ player, loading, login, register, logout, refresh, event, triggerEvent, clearEvent, bossReveal, clearBossReveal }),
    [player, loading, login, register, logout, refresh, event, triggerEvent, clearEvent, bossReveal, clearBossReveal]
  );

  return (
    <PlayerCtx.Provider value={value}>
      {children}
    </PlayerCtx.Provider>
  );
};

export const usePlayer = () => useContext(PlayerCtx);
