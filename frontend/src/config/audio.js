// Audio configuration — persistence keys and the audio-file manifest.
// Every category starts with `file: null` (synthesized fallback only);
// registering a real asset later is done at runtime via
// sound.setAudioSource(category, url) and never requires touching this
// list's shape, only its values.
export const AUDIO_STORAGE_KEYS = {
  master: "axiom_audio_master_volume",
  sfx: "axiom_audio_sfx_volume",
};

export const AUDIO_FILES = {
  uiHover: null,
  uiClick: null,
  questAccepted: null,
  questCompleted: null,
  xpGained: null,
  levelUp: null,
  rankUp: null,
  medalUnlocked: null,
  artifactUnlocked: null,
  bossEncounter: null,
  bossVictory: null,
  achievementUnlocked: null,
  architectInteraction: null,
  warning: null,
  secretQuest: null,
};
