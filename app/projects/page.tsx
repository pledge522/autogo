"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, LayoutGrid, Clock } from "lucide-react";
import { motion } from "framer-motion";

interface ProjectMeta {
  id: string;
  name: string;
  projectDir: string;
  port: number;
  createdAt: number;
  lastMessage?: string;
}

export default function ProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<ProjectMeta[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProjects();
  }, []);

  async function loadProjects() {
    try {
      const res = await fetch("/api/projects");
      if (res.ok) {
        const data = await res.json();
        setProjects(data);
      }
    } catch (err) {
      console.error("加载项目失败:", err);
    } finally {
      setLoading(false);
    }
  }

  async function deleteProject(id: string) {
    if (!confirm("确定要删除这个项目吗？")) return;

    try {
      await fetch(`/api/session?id=${id}`, { method: "DELETE" });
      await loadProjects();
    } catch (err) {
      console.error("删除项目失败:", err);
    }
  }

  function openProject(id: string) {
    // 切换到指定 session，并跳转到 builder 页面
    localStorage.setItem("selectedSessionId", id);
    router.push(`/builder?session=${id}`);
  }

  function formatTime(timestamp: number) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - timestamp;

    if (diff < 60000) return "刚刚";
    if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小时前`;

    return date.toLocaleDateString("zh-CN", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* 顶部栏 */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/builder")}
              className="text-gray-600 hover:text-gray-900 transition-colors"
            >
              ← 返回
            </button>
            <h1 className="text-xl font-bold text-gray-900">项目列表</h1>
          </div>
          <button
            onClick={() => router.push("/builder")}
            className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
          >
            <Plus size={16} />
            新建项目
          </button>
        </div>
      </header>

      {/* 内容区 */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-20">
            <LayoutGrid size={64} className="mx-auto text-gray-300 mb-4" />
            <h2 className="text-lg font-semibold text-gray-900 mb-2">暂无项目</h2>
            <p className="text-gray-500 mb-6">创建你的第一个 AI 项目</p>
            <button
              onClick={() => router.push("/builder")}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
            >
              <Plus size={16} />
              开始创建
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <motion.div
                key={project.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="group relative bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden"
              >
                {/* 预览区域 */}
                <div className="h-40 bg-gradient-to-br from-gray-100 to-gray-200 relative overflow-hidden">
                  <iframe
                    src={`http://localhost:${project.port}`}
                    className="w-full h-full border-0 scale-50 origin-top-left"
                    style={{ width: "200%", height: "200%" }}
                    sandbox="allow-scripts allow-same-origin"
                    title={project.name}
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                </div>

                {/* 信息区域 */}
                <div className="p-4">
                  <h3 className="font-semibold text-gray-900 mb-1 truncate">
                    {project.name || "未命名项目"}
                  </h3>
                  <div className="flex items-center gap-2 text-sm text-gray-500 mb-3">
                    <Clock size={12} />
                    <span>{formatTime(project.createdAt)}</span>
                  </div>

                  {project.lastMessage && (
                    <p className="text-xs text-gray-400 truncate mb-3">
                      {project.lastMessage}
                    </p>
                  )}

                  {/* 操作按钮 */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openProject(project.id)}
                      className="flex-1 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-800 transition-colors"
                    >
                      打开
                    </button>
                    <button
                      onClick={() => deleteProject(project.id)}
                      className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                      title="删除项目"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
