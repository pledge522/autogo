"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  X,
  Search,
  Check,
  Grid3X3,
  List,
  Filter,
  ChevronDown,
  Cpu,
  Code2,
  BookOpen,
  Workflow,
  Plug,
  Bot,
  Palette,
} from "lucide-react";

export interface SkillInfo {
  name: string;
  description?: string;
  category?: SkillCategory;
  icon?: string;
  enabled?: boolean;
}

export type SkillCategory = "llm" | "tool" | "knowledge" | "workflow" | "integration" | "agent" | "ui";

const categoryIcons: Record<SkillCategory, React.ReactNode> = {
  llm: <Cpu className="w-4 h-4" />,
  tool: <Code2 className="w-4 h-4" />,
  knowledge: <BookOpen className="w-4 h-4" />,
  workflow: <Workflow className="w-4 h-4" />,
  integration: <Plug className="w-4 h-4" />,
  agent: <Bot className="w-4 h-4" />,
  ui: <Palette className="w-4 h-4" />,
};

const categoryLabels: Record<SkillCategory, string> = {
  llm: "大模型",
  tool: "工具技能",
  knowledge: "知识技能",
  workflow: "工作流",
  integration: "集成服务",
  agent: "智能体",
  ui: "UI 组件",
};

interface SkillModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SkillModal({ isOpen, onClose }: SkillModalProps) {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<SkillCategory | "all">("all");
  const [skills, setSkills] = useState<SkillInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // 加载技能列表
  const loadSkills = useCallback(async () => {
    try {
      const response = await fetch("/api/skills");
      const data = await response.json();
      setSkills(data);
    } catch (err) {
      console.error("加载技能失败:", err);
    }
  }, []);

  // 切换技能状态
  const toggleSkill = useCallback(async (skillName: string, enabled: boolean) => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/skills?name=${skillName}&enabled=${enabled}`, {
        method: "PUT",
      });
      if (!response.ok) {
        throw new Error("更新技能状态失败");
      }
      // 重新加载列表
      await loadSkills();
    } catch (err) {
      console.error("更新技能失败:", err);
    } finally {
      setIsLoading(false);
    }
  }, [loadSkills]);

  // 打开 modal 时加载技能
  useEffect(() => {
    if (isOpen) {
      // 使用 setTimeout 避免在 effect 中直接调用 setState
      const timer = setTimeout(() => {
        loadSkills();
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // 筛选后的技能列表
  const filteredSkills = skills.filter((skill) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (
        !skill.name.toLowerCase().includes(q) &&
        !skill.description?.toLowerCase().includes(q)
      ) {
        return false;
      }
    }
    if (selectedCategory !== "all" && skill.category !== selectedCategory) {
      return false;
    }
    return true;
  });

  // 按分组展示
  const skillGroups = filteredSkills.reduce((acc, skill) => {
    const category = skill.category || "tool";
    if (!acc[category]) acc[category] = [];
    acc[category].push(skill);
    return acc;
  }, {} as Record<string, SkillInfo[]>);

  const enabledCount = skills.filter((s) => s.enabled).length;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative z-10 w-full max-w-5xl h-[75vh] bg-[#FAF9F6] dark:bg-[#1A1A1A] rounded-2xl shadow-2xl overflow-hidden flex flex-col"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E0D8] dark:border-[#3A3A3A]">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-semibold text-[#2C2C2C] dark:text-[#EAEAEA]">技能列表</h2>
            <span className="text-sm text-[#8E8E8E] dark:text-[#9E9E9E]">
              已启用 {enabledCount} 个
            </span>
          </div>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="p-2 hover:bg-[#E5E0D8] dark:hover:bg-[#3A3A3A] rounded-lg transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5 text-[#5C5C5C] dark:text-[#A0A0A0]" />
          </button>
        </div>

        <div className="flex items-center justify-between px-6 py-3 border-b border-[#E5E0D8] dark:border-[#3A3A3A]">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-2 rounded-lg transition-colors ${
                viewMode === "grid"
                  ? "bg-[#E5E0D8] dark:bg-[#3A3A3A] text-[#3341F5]"
                  : "text-[#8E8E8E] dark:text-[#9E9E9E] hover:bg-[#E5E0D8] dark:hover:bg-[#3A3A3A]"
              }`}
            >
              <Grid3X3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-2 rounded-lg transition-colors ${
                viewMode === "list"
                  ? "bg-[#E5E0D8] dark:bg-[#3A3A3A] text-[#3341F5]"
                  : "text-[#8E8E8E] dark:text-[#9E9E9E] hover:bg-[#E5E0D8] dark:hover:bg-[#3A3A3A]"
              }`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3 px-6 py-3 border-b border-[#E5E0D8] dark:border-[#3A3A3A]">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8E8E8E]" />
            <input
              type="text"
              placeholder="搜索技能..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white dark:bg-[#2A2A2A] border border-[#D0CFC9] dark:border-[#3A3A3A] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#3341F5]/20"
            />
          </div>
          <div className="relative">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value as SkillCategory | "all")}
              className="appearance-none pl-8 pr-8 py-2 bg-white dark:bg-[#2A2A2A] border border-[#D0CFC9] dark:border-[#3A3A3A] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#3341F5]/20 cursor-pointer"
            >
              <option value="all">全部类别</option>
              <option value="llm">大模型</option>
              <option value="tool">工具技能</option>
              <option value="knowledge">知识技能</option>
              <option value="workflow">工作流</option>
              <option value="integration">集成服务</option>
              <option value="agent">智能体</option>
              <option value="ui">UI 组件</option>
            </select>
            <Filter className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8E8E8E]" />
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-[#8E8E8E] pointer-events-none" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {viewMode === "grid" ? (
            <div className="space-y-6">
              {Object.entries(skillGroups).map(
                ([category, skillList]) =>
                  skillList.length > 0 && (
                    <div key={category}>
                      <h3 className="text-sm font-medium text-[#5C5C5C] dark:text-[#A0A0A0] mb-3 flex items-center gap-2">
                        {categoryIcons[category as SkillCategory]}
                        {categoryLabels[category as SkillCategory]}
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {skillList.map((skill) => (
                          <SkillCard
                            key={skill.name}
                            skill={skill}
                            onToggle={() => toggleSkill(skill.name, !skill.enabled)}
                            viewMode="grid"
                          />
                        ))}
                      </div>
                    </div>
                  )
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredSkills.map((skill) => (
                <SkillCard
                  key={skill.name}
                  skill={skill}
                  onToggle={() => toggleSkill(skill.name, !skill.enabled)}
                  viewMode="list"
                />
              ))}
            </div>
          )}

          {filteredSkills.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Search className="w-12 h-12 text-[#D0CFC9] dark:text-[#3A3A3A] mb-4" />
              <p className="text-[#8E8E8E] dark:text-[#9E9E9E]">暂无技能</p>
              <p className="text-sm text-[#A0A0A0] dark:text-[#808080] mt-1">
                没有找到符合条件的技能
              </p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

interface SkillCardProps {
  skill: SkillInfo;
  onToggle: () => void;
  viewMode: "grid" | "list";
}

function SkillCard({ skill, onToggle, viewMode }: SkillCardProps) {
  const enabled = skill.enabled ?? false;

  if (viewMode === "list") {
    return (
      <motion.div
        layout
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-4 p-4 bg-white dark:bg-[#2A2A2A] border border-[#E5E0D8] dark:border-[#3A3A3A] rounded-xl hover:border-[#C0BFC9] dark:hover:border-[#4A4A4A] transition-colors"
      >
        <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center bg-gradient-to-br from-[#3341F5] to-[#6366F1] rounded-xl text-xl">
          {skill.icon || ""}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="font-medium text-[#2C2C2C] dark:text-[#EAEAEA]">{skill.name}</h4>
            {skill.category && (
              <span className="px-2 py-0.5 text-xs bg-[#E5E0D8] dark:bg-[#3A3A3A] text-[#5C5C5C] dark:text-[#A0A0A0] rounded">
                {categoryLabels[skill.category]}
              </span>
            )}
          </div>
          <p className="text-sm text-[#8E8E8E] dark:text-[#9E9E9E] mt-1 truncate">{skill.description}</p>
        </div>
        <button
          onClick={onToggle}
          className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            enabled
              ? "bg-[#3341F5] text-white"
              : "bg-white dark:bg-[#2A2A2A] border border-[#D0CFC9] dark:border-[#3A3A3A] text-[#5C5C5C] dark:text-[#A0A0A0] hover:border-[#3341F5]"
          }`}
        >
          {enabled ? (
            <span className="flex items-center gap-1">
              <Check className="w-3 h-3" />
              已启用
            </span>
          ) : (
            "启用"
          )}
        </button>
      </motion.div>
    );
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="group p-4 bg-white dark:bg-[#2A2A2A] border border-[#E5E0D8] dark:border-[#3A3A3A] rounded-xl hover:border-[#C0BFC9] dark:hover:border-[#4A4A4A] hover:shadow-lg transition-all"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 flex items-center justify-center bg-gradient-to-br from-[#3341F5] to-[#6366F1] rounded-xl text-xl">
            {skill.icon || "📦"}
          </div>
          <div>
            <h4 className="font-medium text-[#2C2C2C] dark:text-[#EAEAEA]">{skill.name}</h4>
            {skill.category && (
              <span className="text-xs text-[#A0A0A0]">{categoryLabels[skill.category]}</span>
            )}
          </div>
        </div>
      </div>
      <p className="text-sm text-[#8E8E8E] dark:text-[#9E9E9E] line-clamp-2 mb-4">{skill.description}</p>
      <div className="flex items-center justify-between pt-3 border-t border-[#F0EFEA] dark:border-[#3A3A3A]">
        <div className="flex items-center gap-2">
          {enabled && (
            <span className="flex items-center gap-1 text-xs text-[#3341F5]">
              <Check className="w-3 h-3" />
              已启用
            </span>
          )}
        </div>
        <button
          onClick={onToggle}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            enabled
              ? "bg-[#E5E0D8] dark:bg-[#3A3A3A] text-[#5C5C5C] dark:text-[#A0A0A0] hover:bg-red-100 hover:text-red-600"
              : "bg-white dark:bg-[#2A2A2A] border border-[#D0CFC9] dark:border-[#3A3A3A] text-[#5C5C5C] dark:text-[#A0A0A0] hover:border-[#3341F5]"
          }`}
        >
          {enabled ? "禁用" : "启用"}
        </button>
      </div>
    </motion.div>
  );
}
