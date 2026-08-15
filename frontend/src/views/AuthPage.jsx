import React, { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { usePlayer } from "@/state/PlayerContext";
import { AxiomScene } from "@/components/3d/AxiomScene";
import { sound } from "@/services/sound";
import { toast } from "sonner";
import AxiomArt from "@/components/common/AxiomArt";
import { AXIOM_SYMBOL } from "@/services/assets/registry";

export default function AuthPage() {
  const { player, login, register, loading } = usePlayer();
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ email: "", password: "", display_name: "Habib" });
  const [busy, setBusy] = useState(false);
  const nav = useNavigate();

  if (!loading && player) return <Navigate to="/command" replace />;

  const submit = async (e) => {
    e.preventDefault(); setBusy(true);
    try {
      if (mode === "login") await login(form.email, form.password);
      else await register(form.email, form.password, form.display_name);
      sound.levelUp();
      toast.success("AXIOM PROTOCOL ENGAGED");
      nav("/command", { replace: true });
    } catch (err) {
      const msg = err?.response?.data?.detail || "SYSTEM DENIED";
      toast.error(msg);
    } finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-black">
      <div className="absolute inset-0 opacity-70">
        <AxiomScene intensity={1} dense={true} rank="E" enableBloom={true}/>
      </div>
      <div className="absolute inset-0 grid-void opacity-30" />
      <form onSubmit={submit} className="hud-panel p-8 w-[92%] max-w-md relative z-10 clip-tech scanline" data-testid="auth-form">
        <div className="flex justify-center mb-4">
          <AxiomArt src={AXIOM_SYMBOL} alt="AXIOM" eager className="w-16 h-24 opacity-90" fit="contain" style={{filter: "drop-shadow(0 0 14px rgba(0,240,255,0.5))"}} />
        </div>
        <div className="font-mono text-[10px] tracking-[0.5em] text-[#00F0FF] text-glow-cyan mb-2 text-center">// AXIOM ENTRY PROTOCOL</div>
        <h1 className="font-display text-3xl text-[#EAEAEA] text-glow-cyan mb-1 text-center">MONARCH</h1>
        <div className="font-mono text-xs text-[#8A8A93] tracking-[0.3em] mb-6 text-center">{mode === "login" ? "AUTHENTICATE" : "INITIATE PLAYER"}</div>

        {mode === "register" && (
          <div className="mb-3">
            <label className="font-mono text-[10px] tracking-[0.3em] text-[#8A8A93]">PLAYER NAME</label>
            <input
              type="text" required value={form.display_name}
              onChange={(e) => setForm({...form, display_name: e.target.value})}
              className="w-full bg-black/60 border border-[#00F0FF]/25 text-[#EAEAEA] px-3 py-2 mt-1 font-heading tracking-wide focus:outline-none focus:border-[#00F0FF]"
              data-testid="auth-name"
            />
          </div>
        )}
        <div className="mb-3">
          <label className="font-mono text-[10px] tracking-[0.3em] text-[#8A8A93]">EMAIL</label>
          <input type="email" required value={form.email}
            onChange={(e) => setForm({...form, email: e.target.value})}
            className="w-full bg-black/60 border border-[#00F0FF]/25 text-[#EAEAEA] px-3 py-2 mt-1 font-mono tracking-wide focus:outline-none focus:border-[#00F0FF]"
            data-testid="auth-email" />
        </div>
        <div className="mb-6">
          <label className="font-mono text-[10px] tracking-[0.3em] text-[#8A8A93]">CIPHER</label>
          <input type="password" required minLength={6} value={form.password}
            onChange={(e) => setForm({...form, password: e.target.value})}
            className="w-full bg-black/60 border border-[#00F0FF]/25 text-[#EAEAEA] px-3 py-2 mt-1 font-mono tracking-wide focus:outline-none focus:border-[#00F0FF]"
            data-testid="auth-password" />
        </div>
        <button disabled={busy} type="submit" className="w-full py-3 bg-[#00F0FF]/15 border border-[#00F0FF] text-[#00F0FF] text-glow-cyan font-display tracking-[0.3em] hover:bg-[#00F0FF]/25 transition-colors clip-tech disabled:opacity-40" data-testid="auth-submit">
          {busy ? "PROCESSING..." : mode === "login" ? "ENTER" : "INITIATE"}
        </button>
        <button type="button" onClick={() => setMode(mode === "login" ? "register" : "login")}
          className="w-full mt-4 font-mono text-xs text-[#8A8A93] hover:text-[#00F0FF] tracking-[0.25em]" data-testid="auth-toggle">
          {mode === "login" ? "// NEW PLAYER? INITIATE PROTOCOL" : "// EXISTING PLAYER? AUTHENTICATE"}
        </button>
      </form>
    </div>
  );
}
