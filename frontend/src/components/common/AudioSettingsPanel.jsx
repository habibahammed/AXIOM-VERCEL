import React, { useState, useRef, useEffect } from "react";
import { Volume2, VolumeX, Volume1 } from "lucide-react";
import { sound } from "@/services/sound";

// Small popover: master volume, SFX volume, and mute — the three audio
// controls for the AXIOM audio architecture. Purely a UI layer over
// lib/sound.js; doesn't touch player/game state itself. `muted` and
// `onToggleMute` are passed in from AxiomShell so the existing
// player.settings.sound-backed mute toggle stays the single source of
// truth for on/off — this panel only adds the two new volume sliders.
export default function AudioSettingsPanel({ muted, onToggleMute }) {
  const [open, setOpen] = useState(false);
  const [master, setMaster] = useState(() => Math.round(sound.getMasterVolume() * 100));
  const [sfx, setSfx] = useState(() => Math.round(sound.getSfxVolume() * 100));
  const ref = useRef(null);

  useEffect(() => {
    const onDocClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const Icon = muted ? VolumeX : master < 40 ? Volume1 : Volume2;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        data-testid="btn-audio-settings"
        className="w-9 h-9 flex items-center justify-center border border-white/10 hover:border-[#00F0FF]/60 clip-tech"
        title="Audio settings"
      >
        <Icon size={16} strokeWidth={1.5} />
      </button>

      {open && (
        <div
          className="absolute right-0 top-11 z-30 w-64 hud-panel p-4 clip-tech"
          data-testid="audio-settings-panel"
        >
          <div className="font-mono text-[10px] tracking-[0.3em] text-[#00F0FF] mb-3">// AUDIO</div>

          <button
            onClick={onToggleMute}
            data-testid="btn-mute-toggle"
            className="w-full flex items-center justify-between mb-4 px-2 py-1.5 border border-white/10 hover:border-[#00F0FF]/50 clip-tech font-mono text-[10px] tracking-[0.2em]"
          >
            <span className="text-[#8A8A93]">MUTE</span>
            <span className={muted ? "text-[#FF2A2A]" : "text-[#00F0FF]"}>{muted ? "ON" : "OFF"}</span>
          </button>

          <div className="mb-4">
            <div className="flex justify-between font-mono text-[9px] tracking-[0.2em] text-[#8A8A93] mb-1.5">
              <span>MASTER VOLUME</span><span className="text-[#EAEAEA]">{master}%</span>
            </div>
            <input
              type="range" min={0} max={100} value={master}
              onChange={(e) => {
                const v = Number(e.target.value);
                setMaster(v);
                sound.setMasterVolume(v / 100);
              }}
              className="w-full accent-[#00F0FF]"
              data-testid="slider-master-volume"
            />
          </div>

          <div>
            <div className="flex justify-between font-mono text-[9px] tracking-[0.2em] text-[#8A8A93] mb-1.5">
              <span>SFX VOLUME</span><span className="text-[#EAEAEA]">{sfx}%</span>
            </div>
            <input
              type="range" min={0} max={100} value={sfx}
              onChange={(e) => {
                const v = Number(e.target.value);
                setSfx(v);
                sound.setSfxVolume(v / 100);
              }}
              className="w-full accent-[#FFB000]"
              data-testid="slider-sfx-volume"
            />
          </div>
        </div>
      )}
    </div>
  );
}
