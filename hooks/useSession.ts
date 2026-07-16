import { useCallback, useState, useEffect } from "react";

interface SessionInfo {
  id: string;
  port: number;
  projectDir: string;
}

interface UseSessionReturn {
  session: SessionInfo | null;
  isReady: boolean; // 环境是否准备好（npm install + Vite 都完成）
  createSession: () => Promise<void>;
  loadSession: (sessionId: string) => Promise<void>;
}

export function useSession(): UseSessionReturn {
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [isReady, setIsReady] = useState(false);

  const createSession = useCallback(async () => {
    setIsReady(false);
    try {
      const res = await fetch("/api/session", { method: "POST" });
      if (!res.ok) {
        const err = await res.json();
        console.error("创建会话失败:", err);
        return;
      }
      const data = await res.json();
      const info: SessionInfo = {
        id: data.id,
        port: data.port,
        projectDir: data.projectDir,
      };
      setSession(info);
      setIsReady(true); // 后端已经等 npm install + Vite 完成后才返回，所以这里直接标记为 ready
    } catch (err) {
      console.error("创建会话异常:", err);
    }
  }, []);

  const loadSession = useCallback(async (sessionId: string) => {
    setIsReady(false);
    try {
      // 先从 session-meta.json 中查找 session 信息
      const res = await fetch(`/api/session?id=${sessionId}`);
      if (!res.ok) {
        console.error("加载会话失败:", await res.text());
        return;
      }
      const data = await res.json();
      const info: SessionInfo = {
        id: data.id,
        port: data.port,
        projectDir: data.projectDir,
      };
      setSession(info);
      // 恢复 session 时，假设项目已经存在，直接标记为 ready
      setIsReady(true);
    } catch (err) {
      console.error("加载会话异常:", err);
    }
  }, []);

  return { session, isReady, createSession, loadSession };
}
