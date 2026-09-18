import React from "react";

interface GrevyaEmblemProps {
  className?: string;
  size?: number;
  variant?: "brand" | "mono" | "dark";
}

/**
 * Modern AI Monogram Emblem for Grevya AI Interviewer.
 * Represents intelligence, speech/audio recognition, and video interview analysis.
 * Features:
 * - Electric Indigo to Cyan gradient squircle with ambient glow & glass sheen.
 * - Precision-sculpted futuristic 'G' with an embedded AI audio waveform and vision aperture.
 * - Radiant AI neural spark star.
 */
export function GrevyaEmblem({
  className = "",
  size = 36,
  variant = "brand",
}: GrevyaEmblemProps) {
  const gradientId = "grevya-emblem-gradient";
  const glowId = "grevya-emblem-glow";
  const glassId = "grevya-emblem-glass";

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 44 44"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 transition-all duration-300 group-hover:scale-105 group-hover:drop-shadow-[0_4px_16px_rgba(30,64,245,0.35)] ${className}`}
      aria-label="Grevya AI Logo"
    >
      <defs>
        {/* Luminous Sapphire to Cyan Gradient */}
        <linearGradient
          id={gradientId}
          x1="2"
          y1="2"
          x2="42"
          y2="42"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#172fe1" />
          <stop offset="45%" stopColor="#1e40f5" />
          <stop offset="85%" stopColor="#2563eb" />
          <stop offset="100%" stopColor="#00d2ff" />
        </linearGradient>

        {/* Top Glass Sheen Overlay */}
        <linearGradient
          id={glassId}
          x1="22"
          y1="2"
          x2="22"
          y2="20"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.32" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0.02" />
        </linearGradient>

        {/* Ambient Glow */}
        <filter
          id={glowId}
          x="-2"
          y="-1"
          width="48"
          height="48"
          filterUnits="userSpaceOnUse"
        >
          <feDropShadow
            dx="0"
            dy="2"
            stdDeviation="2"
            floodColor="#1e40f5"
            floodOpacity="0.28"
          />
        </filter>
      </defs>

      {/* Main Squircle Container */}
      <rect
        x="2"
        y="2"
        width="40"
        height="40"
        rx="12"
        fill={variant === "dark" ? "#0f172a" : `url(#${gradientId})`}
        filter={`url(#${glowId})`}
      />

      {/* Glass Highlight on Upper Dome */}
      <rect
        x="3"
        y="3"
        width="38"
        height="19"
        rx="10"
        fill={`url(#${glassId})`}
      />

      {/* Inner Precision Rim */}
      <rect
        x="2.5"
        y="2.5"
        width="39"
        height="39"
        rx="11.5"
        stroke="white"
        strokeOpacity="0.22"
        strokeWidth="1"
      />

      {/* Futuristic 'G' Monogram Vector Body */}
      <path
        d="M29.5 16.2C27.5 13.6 24.5 12 21 12C15.477 12 11 16.477 11 22C11 27.523 15.477 32 21 32C26.3 32 30.6 28 31.1 22.8C31.2 22 30.6 21.4 29.8 21.4H21C20.3 21.4 19.8 21.9 19.8 22.6V23.4C19.8 24.1 20.3 24.6 21 24.6H27.8C27 27.2 24.3 29.2 21 29.2C17.023 29.2 13.8 26.023 13.8 22C13.8 17.977 17.023 14.8 21 14.8C23.3 14.8 25.4 15.9 26.8 17.6C27.2 18.1 28 18.2 28.5 17.8L29.2 17.2C29.6 16.9 29.7 16.5 29.5 16.2Z"
        fill="white"
      />

      {/* AI Speech Wave / Voice Analysis Spectrum in Core Aperture */}
      <rect
        x="18.8"
        y="18.5"
        width="2"
        height="7"
        rx="1"
        fill="#a5f3fc"
      />
      <rect
        x="22.2"
        y="16.5"
        width="2.2"
        height="11"
        rx="1.1"
        fill="#00e5ff"
      />
      <rect
        x="25.8"
        y="19"
        width="2"
        height="6"
        rx="1"
        fill="#a5f3fc"
      />

      {/* Radiant AI 4-Point Sparkle at Top-Right Node */}
      <path
        d="M33 7.5C33 9.4 34.6 11 36.5 11C34.6 11 33 12.6 33 14.5C33 12.6 31.4 11 29.5 11C31.4 11 33 9.4 33 7.5Z"
        fill="#00f0ff"
      />
      <circle
        cx="33"
        cy="11"
        r="1"
        fill="#ffffff"
      />
    </svg>
  );
}
