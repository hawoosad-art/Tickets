import React from "react";

export function TeamCrest({
  shortCode,
  accentColor = "#35D399",
  size = "md",
}: {
  shortCode: string;
  accentColor?: string;
  size?: "sm" | "md" | "lg";
}) {
  const dims =
    size === "sm"
      ? "w-10 h-10 text-xs"
      : size === "lg"
        ? "w-16 h-16 text-base"
        : "w-12 h-12 text-sm";

  return (
    <div
      className={`relative inline-flex items-center justify-center rounded-2xl border border-[#293548] bg-[#0B1020] font-extrabold tracking-wider text-[#F8FAFC] shadow-inner select-none ${dims}`}
      style={{
        boxShadow: `inset 0 0 18px ${accentColor}28`,
        borderColor: `${accentColor}66`,
      }}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 40 44"
        className="absolute inset-1.5 w-[calc(100%-12px)] h-[calc(100%-12px)] opacity-25"
        fill="none"
      >
        <path
          d="M20 2L36 8V21C36 31.5 28.8 38.8 20 42C11.2 38.8 4 31.5 4 21V8L20 2Z"
          stroke={accentColor}
          strokeWidth="2.5"
        />
      </svg>
      <span className="relative z-10">{shortCode.slice(0, 3).toUpperCase()}</span>
    </div>
  );
}
