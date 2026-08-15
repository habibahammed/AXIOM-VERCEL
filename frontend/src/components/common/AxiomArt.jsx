import React from "react";

// Thin, presentational-only <img> wrapper for AXIOM asset artwork.
// Lazy-loads by default, decodes async, and silently no-ops on missing src
// (never throws, never blocks the parent UI). Purely visual — no state,
// no network calls beyond the browser's own image fetch.
export default function AxiomArt({ src, alt = "", className = "", style = {}, fit = "cover", eager = false }) {
  if (!src) return null;
  return (
    <img
      src={src}
      alt={alt}
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      draggable={false}
      className={className}
      style={{ objectFit: fit, ...style }}
      onError={(e) => { e.currentTarget.style.display = "none"; }}
    />
  );
}
