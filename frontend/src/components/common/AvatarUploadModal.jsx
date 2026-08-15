import React, { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "@/services/api";
import { usePlayer } from "@/state/PlayerContext";
import { X, Upload, Trash2, User } from "lucide-react";
import { toast } from "sonner";
import { sound } from "@/services/sound";

const MAX_BYTES = 500_000; // ~500KB base64

export default function AvatarUploadModal({ open, onClose }) {
  const { player, refresh } = usePlayer();
  const [preview, setPreview] = useState(player?.avatar_url || null);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef(null);

  const pick = () => inputRef.current?.click();
  const onFile = async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    if (file.size > 800_000) { toast.error("MAX 800KB"); return; }
    const reader = new FileReader();
    reader.onload = () => {
      const url = reader.result;
      if (typeof url === "string" && url.length > MAX_BYTES * 1.5) {
        toast.error("IMAGE TOO LARGE");
        return;
      }
      setPreview(url);
    };
    reader.readAsDataURL(file);
  };
  const save = async () => {
    setBusy(true); sound.ui();
    try {
      await api.post("/player/avatar", { avatar_url: preview || "" });
      await refresh();
      toast.success("SIGIL SET");
      onClose?.();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "UPLOAD FAILED");
    } finally { setBusy(false); }
  };
  const clear = async () => {
    setPreview(null);
  };
  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
        className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4"
        onClick={onClose}
        data-testid="avatar-modal"
      >
        <motion.div
          initial={{scale:0.9, opacity:0}} animate={{scale:1, opacity:1}}
          transition={{duration:0.35, ease:[0.2,0.9,0.3,1]}}
          className="hud-panel p-8 max-w-md w-full relative"
          onClick={e => e.stopPropagation()}
        >
          <button onClick={onClose} className="absolute top-4 right-4 text-[#8A8A93] hover:text-[#FF2A2A]"><X size={18} strokeWidth={1.5}/></button>
          <div className="font-mono text-[10px] tracking-[0.5em] text-[#00F0FF] mb-1">// PLAYER SIGIL</div>
          <h2 className="font-display text-2xl text-[#EAEAEA] mb-4 text-glow-cyan">SET PROFILE IMAGE</h2>
          <div className="flex flex-col items-center gap-4">
            <div className="w-32 h-32 border border-[#00F0FF]/60 clip-tech overflow-hidden bg-black/60 flex items-center justify-center" data-testid="avatar-preview">
              {preview ? (
                <img src={preview} alt="preview" className="w-full h-full object-cover"/>
              ) : (
                <User size={48} className="text-[#8A8A93]" strokeWidth={1}/>
              )}
            </div>
            <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={onFile} data-testid="avatar-input"/>
            <div className="flex gap-2">
              <button onClick={pick} className="px-4 py-2 border border-[#00F0FF] text-[#00F0FF] hover:bg-[#00F0FF]/15 clip-tech font-display tracking-[0.25em] text-xs inline-flex items-center gap-2" data-testid="btn-pick-avatar">
                <Upload size={14} strokeWidth={1.5}/> CHOOSE IMAGE
              </button>
              {preview && (
                <button onClick={clear} className="px-4 py-2 border border-[#FF2A2A]/50 text-[#FF2A2A] hover:bg-[#FF2A2A]/10 clip-tech font-display tracking-[0.25em] text-xs inline-flex items-center gap-2" data-testid="btn-clear-avatar">
                  <Trash2 size={14} strokeWidth={1.5}/> CLEAR
                </button>
              )}
            </div>
            <button onClick={save} disabled={busy} className="w-full py-2 border border-[#FFB000] text-[#FFB000] hover:bg-[#FFB000]/15 clip-tech font-display tracking-[0.3em] text-sm disabled:opacity-40" data-testid="btn-save-avatar">
              {busy ? "SAVING..." : "SAVE SIGIL"}
            </button>
          </div>
          <div className="font-mono text-[9px] text-[#8A8A93] tracking-[0.25em] mt-4 leading-relaxed">
            Max 800KB. PNG · JPG · WEBP. Your image will appear in the HUD and Player Evolution.
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
