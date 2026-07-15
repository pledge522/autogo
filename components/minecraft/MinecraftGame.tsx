"use client";

import { useState, useCallback, useRef } from "react";
import { Canvas } from "@react-three/fiber";
import * as THREE from "three";
import VoxelWorld from "./VoxelWorld";
import PlayerController from "./PlayerController";
import Hotbar from "./Hotbar";

export type BlockType =
  | "grass"
  | "dirt"
  | "stone"
  | "wood"
  | "leaves"
  | "sand"
  | "planks"
  | "cobblestone"
  | "bedrock";

export interface Block {
  id: string;
  type: BlockType;
  position: [number, number, number];
}

export const BLOCK_COLORS: Record<BlockType, string> = {
  grass: "#7cb342",
  dirt: "#8d6e63",
  stone: "#9e9e9e",
  wood: "#6d4c41",
  leaves: "#4caf50",
  sand: "#fff9c4",
  planks: "#bcaaa4",
  cobblestone: "#757575",
  bedrock: "#424242",
};

export const HOTBAR_ITEMS: BlockType[] = [
  "grass",
  "dirt",
  "stone",
  "wood",
  "planks",
  "cobblestone",
  "sand",
  "leaves",
];

function generateWorld(): Block[] {
  const blocks: Block[] = [];
  const WORLD_SIZE = 16;
  const HALF = Math.floor(WORLD_SIZE / 2);

  for (let x = -HALF; x <= HALF; x++) {
    for (let z = -HALF; z <= HALF; z++) {
      blocks.push({ id: `${x},${-4},${z}`, type: "bedrock", position: [x, -4, z] });
      blocks.push({ id: `${x},${-3},${z}`, type: "stone", position: [x, -3, z] });
      blocks.push({ id: `${x},${-2},${z}`, type: "stone", position: [x, -2, z] });
      blocks.push({ id: `${x},${-1},${z}`, type: "dirt", position: [x, -1, z] });
      blocks.push({ id: `${x},${0},${z}`, type: "grass", position: [x, 0, z] });
    }
  }

  const trees: [number, number, number][] = [
    [-5, 0, -5], [5, 0, 4], [-4, 0, 6], [6, 0, -4],
    [-6, 0, 2], [3, 0, -5], [0, 0, -6], [7, 0, 0], [-2, 0, 7],
  ];
  for (const [tx, ty, tz] of trees) {
    for (let i = 1; i <= 4; i++) {
      blocks.push({ id: `${tx},${ty + i},${tz}`, type: "wood", position: [tx, ty + i, tz] });
    }
    for (let dx = -2; dx <= 2; dx++) {
      for (let dz = -2; dz <= 2; dz++) {
        for (let dy = 3; dy <= 5; dy++) {
          if (Math.abs(dx) === 2 && Math.abs(dz) === 2) continue;
          const bx = tx + dx, by = ty + dy, bz = tz + dz;
          const id = `${bx},${by},${bz}`;
          if (!blocks.some((b) => b.id === id)) {
            blocks.push({ id, type: "leaves", position: [bx, by, bz] });
          }
        }
      }
    }
  }

  return blocks;
}

export default function MinecraftGame() {
  const [blocks, setBlocks] = useState<Block[]>(() => generateWorld());
  const [selectedBlock, setSelectedBlock] = useState<BlockType>("grass");
  const [isLocked, setIsLocked] = useState(false);
  const worldRef = useRef<THREE.Group>(null);

  const handleBreakBlock = useCallback((blockId: string) => {
    setBlocks((prev) => prev.filter((b) => b.id !== blockId));
  }, []);

  const handlePlaceBlock = useCallback(
    (position: [number, number, number]) => {
      const [x, y, z] = position;
      const id = `${Math.round(x)},${Math.round(y)},${Math.round(z)}`;
      setBlocks((prev) => {
        if (prev.some((b) => b.id === id)) return prev;
        return [...prev, { id, type: selectedBlock, position }];
      });
    },
    [selectedBlock]
  );

  const handleSelectBlock = useCallback((type: BlockType) => {
    setSelectedBlock(type);
  }, []);

  return (
    <div className="w-full h-full relative">
      <Canvas
        camera={{ fov: 75, near: 0.1, far: 200, position: [0, 2.1, 8] }}
        gl={{ antialias: true }}
        onCreated={({ gl }) => {
          gl.setClearColor(new THREE.Color("#87CEEB"));
        }}
      >
        <fog attach="fog" args={["#87CEEB", 30, 60]} />
        <ambientLight intensity={0.6} />
        <directionalLight position={[10, 20, 10]} intensity={1.2} />
        <directionalLight position={[-10, 10, -10]} intensity={0.3} />
        <hemisphereLight args={["#87CEEB", "#8B4513", 0.4]} />

        <VoxelWorld ref={worldRef} blocks={blocks} />
        <PlayerController
          worldRef={worldRef}
          selectedBlock={selectedBlock}
          onBreakBlock={handleBreakBlock}
          onPlaceBlock={handlePlaceBlock}
          onSelectBlock={handleSelectBlock}
          onLockChange={setIsLocked}
        />
      </Canvas>

      {/* Crosshair */}
      {isLocked && (
        <div className="fixed inset-0 pointer-events-none flex items-center justify-center z-30">
          <div className="w-0.5 h-5 bg-white/80 absolute" />
          <div className="w-5 h-0.5 bg-white/80 absolute" />
        </div>
      )}

      {/* Start screen */}
      {!isLocked && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/60 z-40">
          <div className="text-center text-white">
            <h1 className="text-3xl font-bold mb-1 tracking-tight">
              我的世界
            </h1>
            <p className="text-base text-white/60 mb-6">网页版 · 体素沙盒</p>
            <button
              onClick={() => {
                const canvas = document.querySelector("canvas");
                canvas?.click();
              }}
              className="px-6 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-sm font-medium backdrop-blur-sm transition-colors border border-white/20"
            >
              点击开始游戏
            </button>
            <div className="mt-6 text-xs text-white/40 space-y-1.5 leading-relaxed">
              <p>WASD 移动 · 空格 跳跃</p>
              <p>左键 破坏方块 · 右键 放置方块</p>
              <p>数字键 1-8 / 滚轮 切换方块</p>
              <p>ESC 暂停</p>
            </div>
          </div>
        </div>
      )}

      {/* Hotbar */}
      <Hotbar
        selectedBlock={selectedBlock}
        onSelect={handleSelectBlock}
        isLocked={isLocked}
      />
    </div>
  );
}
