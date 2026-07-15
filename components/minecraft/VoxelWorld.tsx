"use client";

import { forwardRef } from "react";
import * as THREE from "three";
import type { Block, BlockType } from "./MinecraftGame";
import { BLOCK_COLORS } from "./MinecraftGame";

interface VoxelWorldProps {
  blocks: Block[];
}

const VoxelWorld = forwardRef<THREE.Group, VoxelWorldProps>(
  ({ blocks }, ref) => {
    return (
      <group ref={ref}>
        {blocks.map((block) => (
          <BlockMesh key={block.id} block={block} />
        ))}
      </group>
    );
  }
);

VoxelWorld.displayName = "VoxelWorld";

function BlockMesh({ block }: { block: Block }) {
  const { type, id, position } = block;
  return (
    <mesh
      position={position}
      userData={{ blockId: id, blockPosition: position, blockType: type }}
    >
      <boxGeometry args={[0.98, 0.98, 0.98]} />
      <meshLambertMaterial color={BLOCK_COLORS[type as BlockType]} />
    </mesh>
  );
}

export default VoxelWorld;
