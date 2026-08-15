import React, { useEffect, useState } from "react";
import { api } from "@/services/api";
import { usePlayer } from "@/state/PlayerContext";
import { sound } from "@/services/sound";
import { toast } from "sonner";
import { Users, Copy, LogOut, UserPlus, Skull, Sparkles } from "lucide-react";

export default function GuildPage() {
  const { player, refresh } = usePlayer();
  const [g, setG] = useState(null);
  const [busy, setBusy] = useState(false);
  const [code, setCode] = useState("");

  const load = async () => {
    const { data } = await api.get("/guild/me");
    setG(data);
  };
  useEffect(() => { load(); }, []);

  const create = async () => {
    setBusy(true); sound.ui();
    try { await api.post("/guild/create"); await load(); await refresh(); toast.success("GUILD FORGED"); sound.levelUp(); }
    catch (e) { toast.error(e?.response?.data?.detail || "FORGE FAILED"); }
    finally { setBusy(false); }
  };
  const join = async (e) => {
    e.preventDefault(); setBusy(true); sound.ui();
    try { await api.post("/guild/join", { code: code.trim().toUpperCase() }); await load(); await refresh(); toast.success("JOINED GUILD"); sound.rankUp(); }
    catch (err) { toast.error(err?.response?.data?.detail || "JOIN FAILED"); }
    finally { setBusy(false); }
  };
  const leave = async () => {
    setBusy(true);
    try { await api.post("/guild/leave"); setG({guild:null}); await refresh(); toast.success("LEFT GUILD"); }
    finally { setBusy(false); }
  };
  const copy = () => {
    navigator.clipboard.writeText(g.guild.code);
    toast.success("CODE COPIED");
  };

  return (
    <div>
      <div className="mb-6">
        <div className="font-mono text-[10px] tracking-[0.5em] text-[#00F0FF]">// MONARCH GUILD</div>
        <h1 className="font-display text-3xl text-[#EAEAEA] text-glow-cyan mt-1">TWO-PLAYER PACT</h1>
        <div className="font-mono text-xs text-[#8A8A93] tracking-[0.3em] mt-1">SHARED BOSS DAMAGE · JOINT MOMENTUM</div>
      </div>

      {!g ? (
        <div className="hud-panel p-8 font-mono text-[#00F0FF] tracking-[0.4em]">// LINKING ...</div>
      ) : !g.guild ? (
        <div className="grid md:grid-cols-2 gap-4">
          <div className="hud-panel p-6 scanline">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles size={16} className="text-[#00F0FF]" strokeWidth={1.5}/>
              <div className="font-display text-lg text-[#EAEAEA]">FORGE A GUILD</div>
            </div>
            <p className="font-heading text-sm text-[#8A8A93] mb-4">Create a new Monarch Guild. Share the code with one other player. Your boss damage will echo across both accounts.</p>
            <button onClick={create} disabled={busy}
              className="w-full py-2.5 border border-[#00F0FF] text-[#00F0FF] hover:bg-[#00F0FF]/15 clip-tech font-display tracking-[0.3em] disabled:opacity-40" data-testid="btn-create-guild">
              {busy ? "FORGING..." : "FORGE GUILD"}
            </button>
          </div>
          <form onSubmit={join} className="hud-panel p-6">
            <div className="flex items-center gap-2 mb-3">
              <UserPlus size={16} className="text-[#FFB000]" strokeWidth={1.5}/>
              <div className="font-display text-lg text-[#EAEAEA]">JOIN A GUILD</div>
            </div>
            <label className="font-mono text-[10px] tracking-[0.3em] text-[#8A8A93]">6-CHARACTER CODE</label>
            <input value={code} onChange={e => setCode(e.target.value.toUpperCase())} maxLength={6}
              placeholder="XXXXXX"
              className="w-full bg-black/60 border border-[#00F0FF]/25 text-[#EAEAEA] px-3 py-2 mt-1 mb-4 font-mono tracking-[0.5em] text-lg focus:outline-none focus:border-[#00F0FF]"
              data-testid="guild-code-input"/>
            <button disabled={busy || code.length !== 6}
              className="w-full py-2.5 border border-[#FFB000] text-[#FFB000] hover:bg-[#FFB000]/15 clip-tech font-display tracking-[0.3em] disabled:opacity-30" data-testid="btn-join-guild">
              LOCK IN
            </button>
          </form>
        </div>
      ) : (
        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-12 lg:col-span-4 hud-panel p-5 scanline">
            <div className="font-mono text-[10px] tracking-[0.5em] text-[#00F0FF] mb-2">// GUILD SIGIL</div>
            <div className="font-display text-xl text-[#EAEAEA] mb-1">{g.guild.name}</div>
            <div className="flex items-center gap-2 my-3">
              <div className="flex-1 border border-[#00F0FF]/40 bg-black/40 px-3 py-2 font-mono text-2xl tracking-[0.5em] text-[#00F0FF] text-glow-cyan clip-tech">{g.guild.code}</div>
              <button onClick={copy} className="w-10 h-10 flex items-center justify-center border border-[#00F0FF]/40 hover:bg-[#00F0FF]/10 clip-tech" data-testid="btn-copy-code" title="Copy code">
                <Copy size={14} strokeWidth={1.5} className="text-[#00F0FF]"/>
              </button>
            </div>
            <div className="font-mono text-[10px] text-[#8A8A93] tracking-[0.25em]">
              {g.members.length}/{g.guild.max_members} MEMBERS · SHARED DAMAGE ACTIVE
            </div>
            <button onClick={leave} disabled={busy}
              className="mt-6 w-full py-2 border border-[#FF2A2A]/40 text-[#FF2A2A] hover:bg-[#FF2A2A]/10 clip-tech font-display tracking-[0.25em] text-xs disabled:opacity-40 flex items-center justify-center gap-2" data-testid="btn-leave-guild">
              <LogOut size={12} strokeWidth={1.5}/>LEAVE GUILD
            </button>
          </div>

          <div className="col-span-12 lg:col-span-4 hud-panel p-5">
            <div className="font-mono text-[10px] tracking-[0.5em] text-[#00F0FF] mb-3">// MEMBERS</div>
            <div className="space-y-2">
              {g.members.map(m => (
                <div key={m.id} className="border border-white/10 p-3 clip-tech bg-black/40" data-testid={`guild-member-${m.id}`}>
                  <div className="flex items-center gap-2">
                    <Users size={14} className="text-[#00F0FF]" strokeWidth={1.5}/>
                    <span className="font-display text-sm text-[#EAEAEA] flex-1">{m.display_name}</span>
                    <span className="font-mono text-[10px] text-[#00F0FF]">{m.rank.code}</span>
                  </div>
                  <div className="flex justify-between font-mono text-[10px] text-[#8A8A93] mt-1">
                    <span>LVL {m.level}</span><span>{m.lifetime_xp} XP</span><span>🔥{m.streak}D</span>
                  </div>
                </div>
              ))}
              {g.members.length < g.guild.max_members && (
                <div className="border border-dashed border-white/15 p-3 clip-tech text-center font-mono text-[10px] text-[#8A8A93]">
                  AWAITING PLAYER · CODE {g.guild.code}
                </div>
              )}
            </div>
          </div>

          <div className="col-span-12 lg:col-span-4 hud-panel hud-panel-danger p-5">
            <div className="font-mono text-[10px] tracking-[0.5em] text-[#FF2A2A] mb-3 flex items-center gap-2">
              <Skull size={12} strokeWidth={1.5}/> GUILD BOSS LEDGER
            </div>
            <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
              {g.guild_bosses.slice(0, 9).map(b => (
                <div key={b.boss_key} data-testid={`guild-boss-${b.boss_key}`}>
                  <div className="flex justify-between font-mono text-[10px]">
                    <span className={b.defeated_all ? "text-[#FFB000]" : "text-[#FFB8B8]"}>{b.name}</span>
                    <span className="text-[#8A8A93]">{Math.round(b.pct*100)}%</span>
                  </div>
                  <div className="h-1.5 bg-white/5 mt-0.5">
                    <div className="h-full" style={{width: `${b.pct*100}%`, background: b.defeated_all ? "#FFB000" : "#FF2A2A", boxShadow: `0 0 6px ${b.defeated_all ? "#FFB000" : "#FF2A2A"}`}}/>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
