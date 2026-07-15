"use client";

/* eslint-disable react-hooks/immutability */

import { useEffect, useRef } from "react";
import { useThree, useFrame } from "@react-three/fiber";
import { PointerLockControls } from "@react-three/drei";
import * as THREE from "three";
import type { BlockType } from "./MinecraftGame";
import { HOTBAR_ITEMS } from "./MinecraftGame";

interface PlayerControllerProps {
  worldRef: React.RefObject<THREE.Group | null>;
  selectedBlock: BlockType;
  onBreakBlock: (blockId: string) => void;
  onPlaceBlock: (position: [number, number, number]) => void;
  onSelectBlock: (type: BlockType) => void;
  onLockChange: (locked: boolean) => void;
}

export default function PlayerController({
  worldRef,
  selectedBlock,
  onBreakBlock,
  onPlaceBlock,
  onSelectBlock,
  onLockChange,
}: PlayerControllerProps) {
  const { camera } = useThree();
  const controlsRef = useRef<any>(null); // eslint-disable-line @typescript-eslint/no-explicit-any
  const keys = useRef({
    w: false,
    a: false,
    s: false,
    d: false,
    space: false,
  });
  const velocity = useRef(new THREE.Vector3(0, 0, 0));
  const isOnGround = useRef(false);
  const locked = useRef(false);
  const raycaster = useRef(new THREE.Raycaster());

  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;

    const onLock = () => {
      locked.current = true;
      onLockChange(true);
    };
    const onUnlock = () => {
      locked.current = false;
      onLockChange(false);
    };

    controls.addEventListener("lock", onLock);
    controls.addEventListener("unlock", onUnlock);

    return () => {
      controls.removeEventListener("lock", onLock);
      controls.removeEventListener("unlock", onUnlock);
    };
  }, [onLockChange]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      switch (e.code) {
        case "KeyW":
          keys.current.w = true;
          break;
        case "KeyA":
          keys.current.a = true;
          break;
        case "KeyS":
          keys.current.s = true;
          break;
        case "KeyD":
          keys.current.d = true;
          break;
        case "Space":
          keys.current.space = true;
          break;
      }
      const num = parseInt(e.key);
      if (num >= 1 && num <= HOTBAR_ITEMS.length) {
        onSelectBlock(HOTBAR_ITEMS[num - 1]);
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      switch (e.code) {
        case "KeyW":
          keys.current.w = false;
          break;
        case "KeyA":
          keys.current.a = false;
          break;
        case "KeyS":
          keys.current.s = false;
          break;
        case "KeyD":
          keys.current.d = false;
          break;
        case "Space":
          keys.current.space = false;
          break;
      }
    };

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("keyup", onKeyUp);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("keyup", onKeyUp);
    };
  }, [onSelectBlock]);

  useEffect(() => {
    let scrolled = 0;
    const onWheel = (e: WheelEvent) => {
      if (!locked.current) return;
      scrolled += e.deltaY;
      if (Math.abs(scrolled) > 50) {
        const dir = scrolled > 0 ? 1 : -1;
        const idx = HOTBAR_ITEMS.indexOf(selectedBlock);
        const next = (idx + dir + HOTBAR_ITEMS.length) % HOTBAR_ITEMS.length;
        onSelectBlock(HOTBAR_ITEMS[next]);
        scrolled = 0;
      }
    };
    document.addEventListener("wheel", onWheel);
    return () => document.removeEventListener("wheel", onWheel);
  }, [selectedBlock, onSelectBlock]);

  useEffect(() => {
    const onMouseDown = (e: MouseEvent) => {
      if (!locked.current) return;
      const group = worldRef.current;
      if (!group) return;

      raycaster.current.setFromCamera(new THREE.Vector2(0, 0), camera);

      const intersects = raycaster.current.intersectObjects(
        group.children,
        false
      );
      if (intersects.length === 0) return;

      const hit = intersects[0];
      const mesh = hit.object as THREE.Mesh;
      const blockId = mesh.userData.blockId as string;

      if (e.button === 0) {
        onBreakBlock(blockId);
      } else if (e.button === 2) {
        const normal = hit.face!.normal;
        const pos = mesh.userData.blockPosition as [number, number, number];
        const newPos: [number, number, number] = [
          pos[0] + Math.round(normal.x),
          pos[1] + Math.round(normal.y),
          pos[2] + Math.round(normal.z),
        ];
        onPlaceBlock(newPos);
      }
    };

    const onContextMenu = (e: Event) => e.preventDefault();

    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("contextmenu", onContextMenu);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("contextmenu", onContextMenu);
    };
  }, [camera, worldRef, onBreakBlock, onPlaceBlock, selectedBlock]);

  useFrame((_, delta) => {
    if (!locked.current) return;
    const dt = Math.min(delta, 0.05);

    velocity.current.y += -20 * dt;

    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();

    const right = new THREE.Vector3();
    right.crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();

    const moveDir = new THREE.Vector3();
    if (keys.current.w) moveDir.add(forward);
    if (keys.current.s) moveDir.sub(forward);
    if (keys.current.a) moveDir.sub(right);
    if (keys.current.d) moveDir.add(right);

    const speed = 5;
    if (moveDir.lengthSq() > 0) {
      moveDir.normalize();
      velocity.current.x = moveDir.x * speed;
      velocity.current.z = moveDir.z * speed;
    } else {
      velocity.current.x *= 0.85;
      velocity.current.z *= 0.85;
    }

    if (keys.current.space && isOnGround.current) {
      velocity.current.y = 7;
      isOnGround.current = false;
    }

    camera.position.x += velocity.current.x * dt;
    camera.position.z += velocity.current.z * dt;
    camera.position.y += velocity.current.y * dt;

    const feetY = camera.position.y - 1.6;
    if (feetY < 0.5) {
      camera.position.y = 0.5 + 1.6;
      velocity.current.y = 0;
      isOnGround.current = true;
    } else {
      isOnGround.current = false;
    }
  });

  return <PointerLockControls ref={controlsRef} />;
}
