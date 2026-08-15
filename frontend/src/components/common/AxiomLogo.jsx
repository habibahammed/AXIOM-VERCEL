import React from "react";

// AXIOM Monarch System sigil — original mystical geometry.
// Outer hexagonal frame + inner rotating orbital ring + core crystal
export default function AxiomLogo({ size = 40, animate = true, className = "" }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      aria-label="AXIOM"
    >
      <defs>
        <radialGradient id="axCore" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="1"/>
          <stop offset="35%" stopColor="#00F0FF" stopOpacity="0.9"/>
          <stop offset="100%" stopColor="#00F0FF" stopOpacity="0"/>
        </radialGradient>
        <linearGradient id="axStroke" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#00F0FF"/>
          <stop offset="100%" stopColor="#FFB000"/>
        </linearGradient>
      </defs>
      {/* Outer hex frame */}
      <path
        d="M32 3 L57 17 L57 47 L32 61 L7 47 L7 17 Z"
        fill="none" stroke="url(#axStroke)" strokeWidth="1.5" strokeLinejoin="round"
        opacity="0.75"
      />
      {/* Inner hex */}
      <path
        d="M32 12 L49 22 L49 42 L32 52 L15 42 L15 22 Z"
        fill="none" stroke="#00F0FF" strokeWidth="0.6" opacity="0.35"
      />
      {/* Diagonal accents (rank ticks) */}
      <line x1="7" y1="17" x2="14" y2="21" stroke="#FFB000" strokeWidth="1"/>
      <line x1="57" y1="47" x2="50" y2="43" stroke="#FFB000" strokeWidth="1"/>
      {/* Orbital ring (animated) */}
      <g style={{transformOrigin: "32px 32px", animation: animate ? "logoOrbit 12s linear infinite" : "none"}}>
        <ellipse cx="32" cy="32" rx="20" ry="7" fill="none" stroke="#00F0FF" strokeWidth="0.9" opacity="0.55"/>
        <circle cx="52" cy="32" r="1.4" fill="#FFB000"/>
      </g>
      {/* Vertical spine */}
      <line x1="32" y1="8" x2="32" y2="56" stroke="#00F0FF" strokeWidth="0.4" opacity="0.35" strokeDasharray="2 3"/>
      {/* Central crystal — octahedron silhouette */}
      <g style={{transformOrigin: "32px 32px", animation: animate ? "logoPulse 3.6s ease-in-out infinite" : "none"}}>
        <circle cx="32" cy="32" r="8" fill="url(#axCore)"/>
        <path d="M32 24 L40 32 L32 40 L24 32 Z" fill="#00F0FF" opacity="0.85"/>
        <path d="M32 24 L40 32 L32 40 L24 32 Z" fill="none" stroke="#FFFFFF" strokeWidth="0.6"/>
        <circle cx="32" cy="32" r="1.6" fill="#FFFFFF"/>
      </g>
      <style>{`
        @keyframes logoOrbit { from { transform: rotate(0deg);} to { transform: rotate(360deg);} }
        @keyframes logoPulse { 0%,100% { transform: scale(1);} 50% { transform: scale(1.08);} }
      `}</style>
    </svg>
  );
}
