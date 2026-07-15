"use client";

import type { BlockType } from "./MinecraftGame";
import { BLOCK_COLORS, HOTBAR_ITEMS } from "./MinecraftGame";

interface HotbarProps {
  selectedBlock: BlockType;
  onSelect: (type: BlockType) => void;
  isLocked: boolean;
}

export default function Hotbar({
  selectedBlock,
  onSelect,
  isLocked,
}: HotbarProps) {
  return (
    <div
      className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-40 transition-opacity duration-300 ${
        isLocked ? "opacity-100" : "opacity-0"
      }`}
    >
      <div className="flex gap-1 bg-black/40 backdrop-blur-md rounded-2xl p-2 border border-white/10">
        {HOTBAR_ITEMS.map((type, i) => (
          <button
            key={type}
            onClick={() => onSelect(type)}
            className={`
              relative w-11 h-11 rounded-xl flex items-center justify-center
              transition-all duration-150
              ${
                selectedBlock === type
                  ? "bg-white/20 scale-110 ring-2 ring-white/60"
                  : "bg-white/5 hover:bg-white/10"
              }
            `}
          >
            <div
              className="w-7 h-7 rounded-md border border-black/20"
              style={{ backgroundColor: BLOCK_COLORS[type] }}
            />
            <span className="absolute -top-0.5 -left-0.5 text-[10px] font-semibold text-white/60">
              {i + 1}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
