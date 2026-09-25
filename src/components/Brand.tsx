import React from "react";
import { GrevyaEmblem } from "./GrevyaEmblem";

/**
 * Grevya AI Interviewer brand lockup.
 * Features the modern AI squircle emblem with bold tracked typography matching the website theme.
 */
export function Brand({
  variant = "light",
  size = "md",
  subtitle = "AI INTERVIEWER",
}: {
  variant?: "light" | "dark" | "pill";
  size?: "sm" | "md" | "lg";
  subtitle?: string;
}) {
  const iconSize = size === "sm" ? 28 : size === "lg" ? 42 : 34;
  const textColor = variant === "dark" ? "text-white" : "text-slate-900";
  const subColor = variant === "dark" ? "text-cyan-400" : "text-brand-600";

  return (
    <div className="inline-flex items-center gap-2.5 sm:gap-3 select-none">
      <GrevyaEmblem size={iconSize} variant={variant === "dark" ? "dark" : "brand"} />
      <div className="flex flex-col leading-none">
        <span
          className={`font-bold tracking-[0.16em] uppercase font-sans ${
            size === "sm"
              ? "text-xs"
              : size === "lg"
              ? "text-lg"
              : "text-[15px] sm:text-base"
          } ${textColor}`}
        >
          Grevya
        </span>
        <span
          className={`font-semibold tracking-[0.24em] uppercase font-sans ${
            size === "sm"
              ? "text-[7.5px]"
              : size === "lg"
              ? "text-[10px]"
              : "text-[8.5px] sm:text-[9.5px]"
          } ${subColor} mt-0.5`}
        >
          {subtitle}
        </span>
      </div>
    </div>
  );
}
