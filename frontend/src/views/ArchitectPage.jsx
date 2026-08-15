import React, { useEffect, useRef, useState } from "react";
import { architectEngine } from "@/engine/architectEngine";
import { usePlayer } from "@/state/PlayerContext";
import { Send, Mic, MicOff, Volume2, VolumeX } from "lucide-react";
import { sound } from "@/services/sound";
import { createRecognizer, speak, cancelSpeech, voiceSupported } from "@/services/voice";
import { toast } from "sonner";
import AxiomArt from "@/components/common/AxiomArt";
import { ARCHITECT_ART } from "@/services/assets/registry";

export default function ArchitectPage() {
  const { player } = usePlayer();
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const [voiceOut, setVoiceOut] = useState(false);
  const [interim, setInterim] = useState("");
  const boxRef = useRef(null);
  const recogRef = useRef(null);
  const supported = voiceSupported();

  useEffect(() => {
    architectEngine.getHistory().then(data => {
      const h = data.map(m => ({ role: m.role, text: m.text }));
      if (h.length === 0) {
        setMessages([{
          role: "architect",
          text: `${player?.display_name?.toUpperCase()}. THE MONARCH SYSTEM IS ONLINE.\nSTATE YOUR OBJECTIVE. OR REPORT RESISTANCE.\nI WILL RESPOND WITH THE SMALLEST EXECUTABLE COMMAND.`
        }]);
      } else setMessages(h);
    });
    return () => cancelSpeech();
  }, [player]);

  useEffect(() => { boxRef.current?.scrollTo(0, boxRef.current.scrollHeight); }, [messages, interim]);

  const sendText = async (raw) => {
    const t = (raw ?? text).trim();
    if (!t || busy) return;
    setText(""); setInterim(""); setBusy(true);
    sound.architectInteraction();
    setMessages(m => [...m, { role: "user", text: t }, { role: "architect", text: "" }]);
    let full = "";
    await architectEngine.stream(t,
      (delta) => {
        full += delta;
        setMessages(m => {
          const arr = [...m]; arr[arr.length - 1] = { role: "architect", text: (arr[arr.length-1].text || "") + delta };
          return arr;
        });
      },
      () => {
        setBusy(false); sound.xpGain();
        if (voiceOut && full) speak(full, { enabled: true, rate: 0.95, pitch: 0.8 });
      },
      (err) => {
        setMessages(m => {
          const arr = [...m];
          arr[arr.length - 1] = { role: "architect", text: "// TRANSMISSION ERROR — RETRY.\n" + (err?.message || "") };
          return arr;
        });
        setBusy(false);
      }
    );
  };

  const send = (e) => { e?.preventDefault(); sendText(); };

  const startListen = () => {
    if (!supported) { toast.error("VOICE NOT SUPPORTED IN THIS BROWSER"); return; }
    cancelSpeech();
    const r = createRecognizer(
      (finalText) => {
        setListening(false); setInterim("");
        if (finalText) sendText(finalText);
      },
      (partial) => setInterim(partial),
      (err) => { setListening(false); toast.error("VOICE " + err); }
    );
    if (!r) return;
    recogRef.current = r;
    try { r.start(); setListening(true); sound.ui(); }
    catch { toast.error("MIC UNAVAILABLE"); }
  };
  const stopListen = () => {
    try { recogRef.current?.stop(); } catch {}
    setListening(false); setInterim("");
  };

  const suggestions = [
    "I feel resistance. Cannot start.",
    "Give me today's command.",
    "Which boss should I engage next?",
    "Project current trajectory.",
  ];

  const architectState = busy ? "analyzing" : listening ? "quest_generation" : "idle";

  return (
    <div className="relative">
      {/* AUDIT FIX: removed a duplicate <AxiomScene> that previously mounted
          here on top of AxiomShell's own global background scene (two
          WebGL contexts on this page). The shell's single scene now uses
          the same intensity for the /architect route. */}
      <div className="mb-4 flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <div className="w-24 h-24 relative clip-tech border border-[#00F0FF]/60 overflow-hidden flex-shrink-0"
               style={{background:"rgba(0,240,255,0.06)", boxShadow: "0 0 22px rgba(0,240,255,0.45), inset 0 0 22px rgba(0,240,255,0.18)"}}>
            <AxiomArt src={ARCHITECT_ART[architectState]} alt="The Architect" eager className="absolute inset-0 w-full h-full" fit="cover" />
            <div className="absolute inset-0 pointer-events-none" style={{background: "radial-gradient(circle at 50% 40%, transparent 45%, rgba(0,240,255,0.28) 100%)"}}/>
          </div>
          <div>
            <div className="font-mono text-[10px] tracking-[0.5em] text-[#00F0FF] text-glow-cyan">// AXIOM ARCHITECT</div>
            <h1 className="font-display text-3xl text-[#EAEAEA] text-glow-cyan mt-1">STRATEGIC CHANNEL</h1>
            <div className="font-mono text-[10px] text-[#8A8A93] tracking-[0.25em] mt-1">MODEL: GEMMA 4 · FREE LINK</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { const n = !voiceOut; setVoiceOut(n); if (!n) cancelSpeech(); sound.ui(); }}
            className={`px-3 py-1.5 text-xs font-display tracking-[0.25em] border clip-tech flex items-center gap-2 ${voiceOut ? "border-[#00F0FF] text-[#00F0FF] bg-[#00F0FF]/10" : "border-white/15 text-[#8A8A93]"}`}
            data-testid="btn-toggle-voice-out"
            title="Speak architect responses aloud"
          >
            {voiceOut ? <Volume2 size={12} strokeWidth={1.5}/> : <VolumeX size={12} strokeWidth={1.5}/>}
            VOICE OUT
          </button>
        </div>
      </div>

      <div className="hud-panel scanline flex flex-col h-[68vh]">
        <div ref={boxRef} className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[85%] px-4 py-3 clip-tech border ${
                m.role === "user"
                  ? "border-[#FFB000]/40 bg-[#FFB000]/5 text-[#EAEAEA] font-heading"
                  : "border-[#00F0FF]/30 bg-black/40 text-[#EAEAEA] font-mono text-sm whitespace-pre-wrap"
              }`}>
                {m.role === "architect" && <div className="font-mono text-[9px] tracking-[0.5em] text-[#00F0FF] mb-2">// AXIOM</div>}
                {m.text || <span className="text-[#8A8A93]">...</span>}
              </div>
            </div>
          ))}
          {listening && interim && (
            <div className="flex justify-end">
              <div className="max-w-[85%] px-4 py-3 clip-tech border border-[#FFB000]/30 bg-[#FFB000]/5 text-[#8A8A93] font-heading italic">
                <div className="font-mono text-[9px] tracking-[0.5em] text-[#FFB000] mb-1">// LISTENING</div>
                {interim}
              </div>
            </div>
          )}
        </div>
        <div className="border-t border-[#00F0FF]/15 p-3">
          <div className="flex flex-wrap gap-2 mb-3">
            {suggestions.map(s => (
              <button key={s} onClick={() => setText(s)} className="text-[10px] font-mono px-2 py-1 border border-white/10 text-[#8A8A93] hover:text-[#00F0FF] hover:border-[#00F0FF]/40 clip-tech" data-testid={`arch-suggest-${s.slice(0,10)}`}>
                {s}
              </button>
            ))}
          </div>
          <form onSubmit={send} className="flex gap-2">
            <button
              type="button"
              onClick={listening ? stopListen : startListen}
              disabled={!supported || busy}
              className={`w-11 flex items-center justify-center border clip-tech ${listening ? "border-[#FF2A2A] text-[#FF2A2A] bg-[#FF2A2A]/10 animate-pulse" : "border-[#00F0FF] text-[#00F0FF] hover:bg-[#00F0FF]/10"} disabled:opacity-30`}
              data-testid="btn-architect-mic"
              title={supported ? (listening ? "Stop" : "Push to talk") : "Voice unsupported"}
            >
              {listening ? <MicOff size={16} strokeWidth={1.5}/> : <Mic size={16} strokeWidth={1.5}/>}
            </button>
            <input
              value={text} onChange={e => setText(e.target.value)}
              placeholder={listening ? "LISTENING..." : "TRANSMIT COMMAND..."}
              className="flex-1 bg-black/60 border border-[#00F0FF]/25 text-[#EAEAEA] px-3 py-2 font-mono tracking-wide focus:outline-none focus:border-[#00F0FF]"
              data-testid="architect-input"
            />
            <button disabled={busy} className="px-4 py-2 border border-[#00F0FF] text-[#00F0FF] hover:bg-[#00F0FF]/15 clip-tech font-display tracking-[0.25em] text-xs disabled:opacity-40 inline-flex items-center gap-2" data-testid="architect-send">
              <Send size={14} strokeWidth={1.5}/>SEND
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
