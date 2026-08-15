// PERSISTENCE LAYER
// ----------------------------------------------------------------------------
// A thin, versioned, failure-safe wrapper around localStorage.
//
// Versioning: SCHEMA_VERSION is stamped once so a future change to what's
// stored (or its shape) has a documented place to add a real migration step.
// Today there is nothing to migrate — existing keys (axiom_token,
// axiom_audio_master_volume, axiom_audio_sfx_volume) keep their original
// names and are read exactly as before, so no one's saved session or audio
// preferences are lost by introducing this layer.
//
// Safety: every operation is wrapped in try/catch. localStorage can throw
// (private browsing in older Safari, storage quota, disabled by policy,
// SSR/non-browser contexts) — none of that should ever crash the app or an
// API call. Callers get a fallback value instead of an exception.
export const SCHEMA_VERSION = 1;
const VERSION_KEY = "axiom_schema_version";

function stampVersionOnce() {
  try {
    if (window.localStorage.getItem(VERSION_KEY) === null) {
      window.localStorage.setItem(VERSION_KEY, String(SCHEMA_VERSION));
    }
  } catch { /* localStorage unavailable — degrade silently, nothing else depends on this */ }
}
if (typeof window !== "undefined") stampVersionOnce();

export function safeGet(key, fallback = null) {
  try {
    if (typeof window === "undefined") return fallback;
    const v = window.localStorage.getItem(key);
    return v === null ? fallback : v;
  } catch { return fallback; }
}

export function safeSet(key, value) {
  try {
    if (typeof window === "undefined") return false;
    window.localStorage.setItem(key, value);
    return true;
  } catch { return false; }
}

export function safeRemove(key) {
  try {
    if (typeof window === "undefined") return false;
    window.localStorage.removeItem(key);
    return true;
  } catch { return false; }
}
