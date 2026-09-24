"use client";

import React from "react";
import { ArrowLeftRight, Sparkles } from "lucide-react";

interface VersionSwitcherProps {
  currentVersion: "original" | "optimized";
}

export function VersionSwitcher({ currentVersion }: VersionSwitcherProps) {
  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-[#edf6f2] border border-[#bfe2d1] text-xs text-[#1e5842]">
      <Sparkles size={13} className="text-[#257b68]" />
      <span className="font-semibold">Versiune:</span>
      <div className="flex items-center rounded-none border border-[#bfe2d1] bg-white p-0.5 ml-1">
        <span
          className={`px-2 py-0.5 text-[11px] font-medium transition-colors ${
            currentVersion === "original"
              ? "bg-[#257b68] text-white font-bold"
              : "text-[#53605b] hover:text-[#121a18]"
          }`}
        >
          Original
        </span>
        <span
          className={`px-2 py-0.5 text-[11px] font-medium transition-colors ${
            currentVersion === "optimized"
              ? "bg-[#257b68] text-white font-bold"
              : "text-[#53605b] hover:text-[#121a18]"
          }`}
        >
          Optimizat
        </span>
      </div>
    </div>
  );
}
