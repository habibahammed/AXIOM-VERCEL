// Web Speech API wrapper — recognition + synthesis, no network cost.
export function createRecognizer(onFinal, onInterim, onError) {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return null;
  const r = new SR();
  r.continuous = false;
  r.interimResults = true;
  r.lang = "en-US";
  r.onresult = (e) => {
    let interim = "", final = "";
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const res = e.results[i];
      if (res.isFinal) final += res[0].transcript;
      else interim += res[0].transcript;
    }
    if (interim) onInterim?.(interim);
    if (final) onFinal?.(final.trim());
  };
  r.onerror = (e) => onError?.(e.error);
  return r;
}

let currentUtterance = null;
export function speak(text, { enabled = true, rate = 1.0, pitch = 0.85, volume = 1.0 } = {}) {
  if (!enabled) return;
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  cancelSpeech();
  const u = new SpeechSynthesisUtterance(text);
  u.rate = rate; u.pitch = pitch; u.volume = volume;
  // pick a low-pitched voice if available
  const voices = window.speechSynthesis.getVoices();
  const preferred = voices.find(v => /google (us|uk).*male|daniel|alex|david/i.test(v.name)) ||
                    voices.find(v => /en-(US|GB)/.test(v.lang));
  if (preferred) u.voice = preferred;
  currentUtterance = u;
  window.speechSynthesis.speak(u);
}
export function cancelSpeech() {
  if (typeof window !== "undefined" && window.speechSynthesis) {
    try { window.speechSynthesis.cancel(); } catch {}
  }
  currentUtterance = null;
}
export function voiceSupported() {
  return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
}
