// ============================================================================
// AXIOM AUDIO ARCHITECTURE
// ============================================================================
// A single source of truth for every sound cue in AXIOM. Right now every
// category is synthesized live with WebAudio (no audio files exist yet), but
// the architecture is built so real files can be dropped in later with zero
// changes anywhere else in the app:
//
//   sound.setAudioSource("levelUp", "/assets/audio/level_up.mp3")
//
// Once a source is set for a category, that category plays the real file
// instead of its synth fallback automatically. Until then, everything works
// exactly as it does today. No audio files are invented or referenced here.
//
// Volume model:
//   masterVolume  — scales EVERYTHING (SFX + ambient pad/drone)
//   sfxVolume     — additionally scales one-shot SFX hits only (not ambient)
//   muted         — hard-silences all output; independent of the two sliders
//                   above so un-muting restores exactly where the sliders
//                   were left.
//
// Autoplay compliance:
//   The AudioContext is created lazily and only ever *resumed* from within
//   a call stack that originated from a real user gesture (every hook here
//   is invoked from onClick/onChange handlers). The ambient bed additionally
//   waits for a genuine first user interaction anywhere on the page before
//   it will start — if something tries to start it earlier (e.g. on initial
//   mount), the request is queued and fires automatically on the user's
//   first click/keypress/touch instead of being force-played.
// ============================================================================

import { AUDIO_STORAGE_KEYS as STORAGE_KEYS, AUDIO_FILES } from "@/config/audio";
import { safeGet, safeSet } from "@/state/persistence";

function readStoredVolume(key, fallback) {
  const raw = safeGet(key);
  if (raw === null) return fallback;
  const v = parseFloat(raw);
  return Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : fallback;
}

// Category → visual-pulse color map. Only listed categories emit a pulse;
// everything else stays purely audio. Colors come from design_guidelines.json
// (cyan_primary #00F0FF, amber_primary #FFB000, crimson_alert_boss #FF2A2A).
const PULSE_COLORS = {
  xpGained:       "#FFB000", // amber flash on XP gain
  bossEncounter:  "#FF2A2A", // crimson flash on boss alert
  bossHit:        "#FF2A2A", // crimson flash on boss alert (damage frame)
  rankUp:         "#00F0FF", // cyan flash on rank-up
};

class SoundEngine {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.enabled = true;                 // hard on/off, mirrors player.settings.sound
    this.masterVolume = readStoredVolume(STORAGE_KEYS.master, 0.8);
    this.sfxVolume = readStoredVolume(STORAGE_KEYS.sfx, 0.9);
    this.ambientNodes = null;

    // Legacy alias some older call sites may still read directly.
    this.volume = this.masterVolume;

    // Autoplay-safe unlock: defer any audio start until a real gesture.
    this._unlocked = false;
    this._pendingAmbient = false;
    if (typeof window !== "undefined") {
      const unlock = () => this._unlock();
      ["pointerdown", "keydown", "touchstart"].forEach(evt =>
        window.addEventListener(evt, unlock, { once: true, passive: true })
      );
    }

    // Per-category audio elements for real files, created lazily once a
    // source is registered.
    this._fileEls = {};

    // Visual-pulse listener registry — any subscriber (e.g. the overlay
    // component) receives { color, category } whenever a mapped sound plays,
    // synced to the sound's play call (< a frame ahead of audible start).
    this._pulseListeners = new Set();
  }

  // ---- visual pulse bus (paired with existing audio hooks) ---------------
  onPulse(cb) { this._pulseListeners.add(cb); return () => this._pulseListeners.delete(cb); }
  _emitPulse(category) {
    const color = PULSE_COLORS[category];
    if (!color) return;
    this._pulseListeners.forEach((l) => { try { l({ color, category }); } catch {} });
  }

  // ---- lifecycle -----------------------------------------------------
  _unlock() {
    if (this._unlocked) return;
    this._unlocked = true;
    this._ensure();
    if (this._pendingAmbient) {
      this._pendingAmbient = false;
      this.startAmbient();
    }
  }

  _ensure() {
    if (!this.ctx) {
      try {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = 1.0;
        this.masterGain.connect(this.ctx.destination);
      } catch { this.ctx = null; }
    }
    if (this.ctx && this.ctx.state === "suspended") this.ctx.resume();
    return this.ctx;
  }

  // ---- controls: mute / master volume / sfx volume --------------------
  setEnabled(v) { this.enabled = !!v; if (!v) this.stopAmbient(); }
  isEnabled() { return this.enabled; }

  setMasterVolume(v) {
    this.masterVolume = Math.max(0, Math.min(1, v));
    this.volume = this.masterVolume; // keep legacy alias in sync
    safeSet(STORAGE_KEYS.master, String(this.masterVolume));
    this._applyAmbientVolume();
  }
  getMasterVolume() { return this.masterVolume; }

  setSfxVolume(v) {
    this.sfxVolume = Math.max(0, Math.min(1, v));
    safeSet(STORAGE_KEYS.sfx, String(this.sfxVolume));
  }
  getSfxVolume() { return this.sfxVolume; }

  // Legacy alias — old call sites that used setVolume() still work.
  setVolume(v) { this.setMasterVolume(v); }

  // ---- registering real audio files (architecture for "later") --------
  setAudioSource(category, url) {
    if (!(category in AUDIO_FILES)) return;
    AUDIO_FILES[category] = url || null;
    if (url) {
      const el = new Audio(url);
      el.preload = "auto";
      this._fileEls[category] = el;
    } else {
      delete this._fileEls[category];
    }
  }
  hasAudioSource(category) { return !!AUDIO_FILES[category]; }

  // ---- core playback ----------------------------------------------------
  // Every category funnels through here: play the real file if one has
  // been registered, otherwise run the synth fallback.
  _play(category, synthFallback) {
    if (!this.enabled) return;
    // Emit the paired visual pulse first so the flash is perceptibly
    // synced with (or a hair before) the audible attack.
    this._emitPulse(category);
    if (AUDIO_FILES[category] && this._fileEls[category]) {
      try {
        const el = this._fileEls[category];
        el.volume = Math.max(0, Math.min(1, this.masterVolume * this.sfxVolume));
        el.currentTime = 0;
        el.play().catch(() => {}); // autoplay/interrupt errors are non-fatal
        return;
      } catch { /* fall through to synth */ }
    }
    synthFallback?.();
  }

  _tone({ freq = 440, dur = 0.2, type = "sine", gain = 0.15, freqEnd = null, delay = 0 } = {}) {
    if (!this.enabled) return;
    const ctx = this._ensure(); if (!ctx) return;
    const t0 = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (freqEnd) osc.frequency.exponentialRampToValueAtTime(freqEnd, t0 + dur);
    const finalGain = gain * this.masterVolume * this.sfxVolume;
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(finalGain, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g).connect(this.masterGain || ctx.destination);
    osc.start(t0); osc.stop(t0 + dur + 0.02);
  }

  // ==========================================================================
  // NAMED HOOKS — one per requested category. Each is a clean, stable public
  // API; swapping in a real audio file later never requires touching a call
  // site anywhere in the app.
  // ==========================================================================

  /** UI hover — light cursor-over tick */
  uiHover() { this._play("uiHover", () => this._tone({ freq: 1200, dur: 0.03, type: "sine", gain: 0.02 })); }

  /** UI click — button press confirmation */
  uiClick() { this._play("uiClick", () => this._tone({ freq: 880, dur: 0.06, type: "square", gain: 0.05 })); }

  /** Quest accepted — a new quest is added to the board */
  questAccepted() {
    this._play("questAccepted", () => {
      this._tone({ freq: 620, freqEnd: 820, dur: 0.14, type: "triangle", gain: 0.12 });
      this._tone({ freq: 980, dur: 0.1, type: "sine", gain: 0.06, delay: 0.05 });
    });
  }

  /** Quest completed */
  questCompleted() {
    this._play("questCompleted", () => {
      this._tone({ freq: 500, freqEnd: 900, dur: 0.18, type: "triangle", gain: 0.18 });
      this._tone({ freq: 900, freqEnd: 1400, dur: 0.22, type: "sine", gain: 0.10, delay: 0.06 });
      this.swell(0.6, 0.9);
    });
  }

  /** XP gained */
  xpGained() { this._play("xpGained", () => this._tone({ freq: 1200, dur: 0.08, type: "sine", gain: 0.08 })); }

  /** Level up */
  levelUp() {
    this._play("levelUp", () => {
      [0, 0.12, 0.24, 0.4].forEach((d, i) => {
        this._tone({ freq: 440 * (1 + i * 0.4), freqEnd: 880 * (1 + i * 0.4), dur: 0.25, type: "sawtooth", gain: 0.12, delay: d });
      });
      this.swell(1.5, 2.0);
    });
  }

  /** Rank up (also used as the base cue; ascension has its own staged extras below) */
  rankUp() {
    this._play("rankUp", () => {
      [0, 0.15, 0.3, 0.5, 0.7].forEach((d, i) => {
        this._tone({ freq: 300 + i * 200, freqEnd: 1200 + i * 300, dur: 0.35, type: "square", gain: 0.1, delay: d });
      });
      this.swell(2.0, 2.8);
    });
  }

  /** Medal unlocked — ready for when a medal-unlock event exists */
  medalUnlocked() {
    this._play("medalUnlocked", () => {
      this._tone({ freq: 700, dur: 0.3, type: "triangle", gain: 0.15 });
      this._tone({ freq: 1050, dur: 0.35, type: "sine", gain: 0.1, delay: 0.08 });
    });
  }

  /** Artifact unlocked — ready for when an artifact-unlock event exists */
  artifactUnlocked() {
    this._play("artifactUnlocked", () => {
      this._tone({ freq: 500, freqEnd: 750, dur: 0.3, type: "sine", gain: 0.14 });
      this._tone({ freq: 1000, dur: 0.4, type: "triangle", gain: 0.08, delay: 0.1 });
    });
  }

  /** Boss encounter — a boss dossier / reveal opens */
  bossEncounter() {
    this._play("bossEncounter", () => {
      this._tone({ freq: 200, freqEnd: 900, dur: 0.4, type: "sawtooth", gain: 0.15 });
    });
  }

  /** Boss hit — damage dealt mid-fight */
  bossHit() { this._play("bossHit", () => this._tone({ freq: 180, freqEnd: 60, dur: 0.24, type: "sawtooth", gain: 0.18 })); }

  /** Boss victory */
  bossVictory() {
    this._play("bossVictory", () => {
      [0, 0.15, 0.3].forEach((d, i) => this._tone({ freq: 120 + i * 60, freqEnd: 800 + i * 200, dur: 0.4, type: "sawtooth", gain: 0.16, delay: d }));
      this.swell(1.8, 2.4);
    });
  }

  /** Achievement unlocked */
  achievementUnlocked() {
    this._play("achievementUnlocked", () => {
      this._tone({ freq: 660, dur: 0.2, type: "triangle", gain: 0.14 });
      this._tone({ freq: 990, dur: 0.25, type: "sine", gain: 0.1, delay: 0.07 });
      this._tone({ freq: 1320, dur: 0.3, type: "sine", gain: 0.06, delay: 0.14 });
    });
  }

  /** Architect interaction — voice/text exchange with the Architect */
  architectInteraction() {
    this._play("architectInteraction", () => {
      this._tone({ freq: 440, dur: 0.05, type: "sine", gain: 0.04 });
      this._tone({ freq: 660, dur: 0.05, type: "sine", gain: 0.03, delay: 0.04 });
    });
  }

  /** Warning */
  warning() { this._play("warning", () => this._tone({ freq: 200, freqEnd: 900, dur: 0.4, type: "sawtooth", gain: 0.15 })); }

  /** Secret quest — a hidden/rare quest reveals itself */
  secretQuest() {
    this._play("secretQuest", () => {
      this._tone({ freq: 1400, dur: 0.06, type: "sine", gain: 0.05 });
      this._tone({ freq: 1100, dur: 0.06, type: "sine", gain: 0.05, delay: 0.06 });
      this._tone({ freq: 1700, dur: 0.2, type: "sine", gain: 0.07, delay: 0.14 });
    });
  }

  // ---- legacy short-name aliases (kept so existing call sites never break)
  ui() { this.uiClick(); }
  hover() { this.uiHover(); }
  questDone() { this.questCompleted(); }
  xpGain() { this.xpGained(); }
  bossDefeat() { this.bossVictory(); }
  alert() { this.warning(); }

  // ---- ambient bed ------------------------------------------------------
  // Evolving ambient drone — layered oscillators with slow LFO modulation.
  // Waits for a real user gesture before ever producing sound (see _unlock).
  startAmbient() {
    if (!this.enabled) return;
    if (!this._unlocked) { this._pendingAmbient = true; return; }
    const ctx = this._ensure(); if (!ctx || this.ambientNodes) return;
    const drone1 = ctx.createOscillator(); drone1.type = "sine"; drone1.frequency.value = 55;
    const drone2 = ctx.createOscillator(); drone2.type = "sine"; drone2.frequency.value = 82;
    const drone3 = ctx.createOscillator(); drone3.type = "triangle"; drone3.frequency.value = 110;
    const pad1 = ctx.createOscillator(); pad1.type = "sine"; pad1.frequency.value = 220;
    const pad2 = ctx.createOscillator(); pad2.type = "sine"; pad2.frequency.value = 329.6; // E4
    const lfo = ctx.createOscillator(); lfo.type = "sine"; lfo.frequency.value = 0.08;
    const lfoGain = ctx.createGain(); lfoGain.gain.value = 0.008;
    lfo.connect(lfoGain);
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass"; lp.frequency.value = 900; lp.Q.value = 0.7;
    const bassGain = ctx.createGain(); bassGain.gain.value = 0.025 * this.masterVolume;
    const padGain = ctx.createGain(); padGain.gain.value = 0.012 * this.masterVolume;
    lfoGain.connect(padGain.gain);
    drone1.connect(bassGain); drone2.connect(bassGain); drone3.connect(bassGain);
    pad1.connect(lp); pad2.connect(lp); lp.connect(padGain);
    bassGain.connect(this.masterGain); padGain.connect(this.masterGain);
    [drone1, drone2, drone3, pad1, pad2, lfo].forEach(o => o.start());
    this.ambientNodes = { drone1, drone2, drone3, pad1, pad2, lfo, bassGain, padGain };
  }
  stopAmbient() {
    this._pendingAmbient = false;
    if (!this.ambientNodes) return;
    try { Object.values(this.ambientNodes).forEach(n => { if (n.stop) n.stop(); }); } catch {}
    this.ambientNodes = null;
  }
  _applyAmbientVolume() {
    if (!this.ambientNodes || !this.ctx) return;
    const { bassGain, padGain } = this.ambientNodes;
    const t0 = this.ctx.currentTime;
    bassGain.gain.cancelScheduledValues(t0);
    padGain.gain.cancelScheduledValues(t0);
    bassGain.gain.linearRampToValueAtTime(0.025 * this.masterVolume, t0 + 0.15);
    padGain.gain.linearRampToValueAtTime(0.012 * this.masterVolume, t0 + 0.15);
  }
  // Swell — briefly boost the ambient drone gain to create a "moment"
  swell(peak = 1.5, dur = 1.6) {
    if (!this.enabled || !this.ambientNodes) return;
    const ctx = this.ctx; if (!ctx) return;
    const t0 = ctx.currentTime;
    const { bassGain, padGain } = this.ambientNodes;
    const baseB = 0.025 * this.masterVolume;
    const baseP = 0.012 * this.masterVolume;
    bassGain.gain.cancelScheduledValues(t0);
    padGain.gain.cancelScheduledValues(t0);
    bassGain.gain.setValueAtTime(bassGain.gain.value, t0);
    padGain.gain.setValueAtTime(padGain.gain.value, t0);
    bassGain.gain.linearRampToValueAtTime(baseB * peak * 1.6, t0 + 0.25);
    padGain.gain.linearRampToValueAtTime(baseP * peak * 3.2, t0 + 0.25);
    bassGain.gain.exponentialRampToValueAtTime(baseB, t0 + dur);
    padGain.gain.exponentialRampToValueAtTime(baseP, t0 + dur);
  }

  // ---- rank/ascension extras (unchanged behaviour, kept here) -----------
  rankChime(rankCode = "E") {
    const notes = { E: 440, D: 494, C: 523, B: 587, A: 659, S: 740, SS: 880, SSS: 988, "???": 1109 };
    const base = notes[rankCode] || 440;
    this._tone({ freq: base, dur: 0.5, type: "triangle", gain: 0.18 });
    this._tone({ freq: base * 1.5, dur: 0.5, type: "sine", gain: 0.12, delay: 0.1 });
    this._tone({ freq: base * 2, dur: 0.6, type: "sine", gain: 0.08, delay: 0.2 });
    this.swell(2.5, 3.2);
  }
  ascensionRumble() {
    this._tone({ freq: 40, freqEnd: 90, dur: 1.1, type: "sawtooth", gain: 0.1 });
    this._tone({ freq: 60, freqEnd: 140, dur: 1.1, type: "sine", gain: 0.06, delay: 0.1 });
  }
  ascensionImpact() {
    [0, 0.1, 0.22, 0.4, 0.65].forEach((d, i) => {
      this._tone({ freq: 220 + i * 260, freqEnd: 1600 + i * 400, dur: 0.4, type: "square", gain: 0.13, delay: d });
    });
    this._tone({ freq: 45, dur: 0.6, type: "sine", gain: 0.22 });
    this.swell(2.6, 3.6);
  }
}

export const sound = new SoundEngine();
