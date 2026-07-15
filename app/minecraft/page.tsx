"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

const MinecraftGame = dynamic(
  () => import("@/components/minecraft/MinecraftGame"),
  { ssr: false }
);

export default function MinecraftPage() {
  return (
    <div className="fixed inset-0 bg-black overflow-hidden">
      <div className="absolute top-4 left-4 z-50">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 px-3 py-2 bg-black/50 text-white/70 hover:text-white rounded-xl text-sm backdrop-blur-sm transition-colors"
        >
          <ArrowLeft size={16} />
          返回
        </Link>
      </div>
      <Suspense
        fallback={
          <div className="flex items-center justify-center h-screen text-white/60 text-lg">
            加载世界中...
          </div>
        }
      >
        <MinecraftGame />
      </Suspense>
    </div>
  );
}
