import React, { useEffect, useState } from "react";
import { api } from "@/services/api";
import { sound } from "@/services/sound";
import { toast } from "sonner";
import { FlaskConical, Sparkles } from "lucide-react";

export default function EvolutionLab() {
  const [bosses, setBosses] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [form, setForm] = useState({ boss_key: "", days: 3, focus: "" });
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState(null);

  const load = async () => {
    const [b, c] = await Promise.all([api.get("/bosses"), api.get("/campaigns")]);
    const active = b.data.filter(x => x.status === "ACTIVE");
    setBosses(active);
    setCampaigns(c.data);
    setForm(f => ({...f, boss_key: f.boss_key || active[0]?.boss_key || ""}));
  };
  useEffect(() => { load(); }, []);

  const forge = async (e) => {
    e.preventDefault(); setBusy(true); sound.ui();
    try {
      const { data } = await api.post("/campaigns/forge", form);
      setPreview(data);
      toast.success(`CAMPAIGN FORGED · ${data.quests.length} QUESTS`);
      sound.levelUp();
      await load();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "FORGE FAILED");
    } finally { setBusy(false); }
  };

  return (
    <div>
      <div className="mb-6">
        <div className="font-mono text-[10px] tracking-[0.5em] text-[#00F0FF]">// EVOLUTION LAB</div>
        <h1 className="font-display text-3xl text-[#EAEAEA] text-glow-cyan mt-1">CAMPAIGN FORGER</h1>
        <div className="font-mono text-xs text-[#8A8A93] tracking-[0.3em] mt-1">CO-FORGE MULTI-DAY BOSS CAMPAIGNS WITH AXIOM</div>
      </div>

      <div className="grid grid-cols-12 gap-4">
        <form onSubmit={forge} className="col-span-12 lg:col-span-5 hud-panel p-5 scanline" data-testid="lab-form">
          <div className="flex items-center gap-2 mb-4">
            <FlaskConical size={16} className="text-[#00F0FF]" strokeWidth={1.5}/>
            <div className="font-display text-lg text-[#EAEAEA]">NEW CAMPAIGN</div>
          </div>
          <div className="mb-3">
            <label className="font-mono text-[10px] tracking-[0.3em] text-[#8A8A93]">TARGET BOSS</label>
            <select value={form.boss_key} onChange={e=>setForm({...form, boss_key:e.target.value})}
              className="w-full bg-black/60 border border-[#00F0FF]/25 text-[#EAEAEA] px-3 py-2 mt-1 font-mono focus:outline-none focus:border-[#00F0FF]"
              data-testid="lab-boss">
              {bosses.map(b => <option key={b.boss_key} value={b.boss_key}>{b.name} · {b.resistance}/{b.max_resistance}</option>)}
            </select>
          </div>
          <div className="mb-3">
            <label className="font-mono text-[10px] tracking-[0.3em] text-[#8A8A93]">DURATION (DAYS)</label>
            <div className="flex gap-2 mt-1">
              {[3, 5, 7, 14].map(d => (
                <button key={d} type="button" onClick={()=>setForm({...form, days:d})}
                  className={`px-3 py-1.5 text-xs font-display tracking-[0.25em] border clip-tech ${form.days === d ? "border-[#00F0FF] bg-[#00F0FF]/15 text-[#00F0FF]" : "border-white/15 text-[#8A8A93]"}`}>
                  {d}D
                </button>
              ))}
            </div>
          </div>
          <div className="mb-4">
            <label className="font-mono text-[10px] tracking-[0.3em] text-[#8A8A93]">PLAYER FOCUS (OPTIONAL)</label>
            <input value={form.focus} onChange={e=>setForm({...form, focus:e.target.value})}
              placeholder="e.g. deep work in the morning"
              className="w-full bg-black/60 border border-[#00F0FF]/25 text-[#EAEAEA] px-3 py-2 mt-1 font-heading focus:outline-none focus:border-[#00F0FF]"
              data-testid="lab-focus"/>
          </div>
          <button disabled={busy || !form.boss_key} className="w-full py-2 border border-[#00F0FF] text-[#00F0FF] hover:bg-[#00F0FF]/15 clip-tech font-display tracking-[0.3em] disabled:opacity-40 flex items-center justify-center gap-2" data-testid="btn-forge-campaign">
            <Sparkles size={14} strokeWidth={1.5}/>
            {busy ? "AXIOM FORGING..." : "FORGE WITH AXIOM"}
          </button>
          <div className="font-mono text-[9px] text-[#8A8A93] tracking-[0.25em] mt-3">
            The Architect writes {form.days * 2} quests (MAIN + SUPPORT per day) bound to the target boss.
          </div>
        </form>

        <div className="col-span-12 lg:col-span-7 space-y-4">
          {preview && (
            <div className="hud-panel p-5 scanline">
              <div className="font-mono text-[10px] tracking-[0.5em] text-[#FFB000] mb-2">// FRESH CAMPAIGN · {preview.campaign.boss_name}</div>
              <div className="font-display text-xl text-[#EAEAEA] mb-3">{preview.campaign.days}-DAY OPERATION</div>
              <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                {preview.quests.map((q, i) => (
                  <div key={q.id} className="border border-[#00F0FF]/15 p-3 clip-tech bg-black/30" data-testid={`preview-quest-${i}`}>
                    <div className="flex items-center gap-2 mb-1 font-mono text-[9px] tracking-[0.3em]">
                      <span className="text-[#00F0FF]">DAY {Math.floor(i/2)+1}</span>
                      <span className={q.kind === "MAIN" ? "text-[#FFB000]" : "text-[#EAEAEA]"}>{q.kind}</span>
                      <span className="text-[#8A8A93]">· {q.difficulty} · {q.duration_min}m · +{q.xp_reward} XP</span>
                    </div>
                    <div className="font-heading text-[#EAEAEA]">{q.title}</div>
                    <div className="font-mono text-[10px] text-[#8A8A93]">{q.description}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="hud-panel p-5">
            <div className="font-mono text-[10px] tracking-[0.5em] text-[#00F0FF] mb-3">// CAMPAIGN LOG</div>
            {campaigns.length === 0 ? (
              <div className="font-mono text-xs text-[#8A8A93]">No campaigns forged yet.</div>
            ) : (
              <div className="space-y-2">
                {campaigns.map(c => {
                  const pct = c.total ? (c.completed / c.total) * 100 : 0;
                  return (
                    <div key={c.id} className="border border-white/10 p-3 clip-tech" data-testid={`campaign-${c.id}`}>
                      <div className="flex justify-between items-center">
                        <div className="font-display text-sm text-[#EAEAEA]">{c.boss_name}</div>
                        <div className="font-mono text-[10px] text-[#8A8A93]">{c.days}D · {c.completed}/{c.total}</div>
                      </div>
                      <div className="font-mono text-[9px] text-[#8A8A93] mb-2">{c.focus || "general"}</div>
                      <div className="h-1.5 bg-white/5">
                        <div className="h-full bg-[#00F0FF]" style={{width: `${pct}%`, boxShadow: "0 0 6px #00F0FF"}}/>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
