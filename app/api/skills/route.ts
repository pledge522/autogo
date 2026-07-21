import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

/**
 * 获取所有可用技能
 * GET /api/skills
 *
 * 注意：技能文件存储在全局目录，所有项目共享
 */
export async function GET() {
  try {
    const SKILLS_DIR = path.join(process.cwd(), ".opencode", "skills");
    const ENABLED_SKILLS_FILE = path.join(process.cwd(), ".opencode", "enabled-skills.json");

    // 读取已启用的技能
    let enabledSkills: string[] = [];
    try {
      const content = await fs.readFile(ENABLED_SKILLS_FILE, "utf-8");
      const config = JSON.parse(content);
      enabledSkills = config.enabledSkills || [];
    } catch {
      // 文件不存在，返回空列表
    }

    // 扫描所有可用技能
    const skills: Array<{
      name: string;
      description: string;
      category?: string;
      enabled: boolean;
    }> = [];

    try {
      const skillDirs = await fs.readdir(SKILLS_DIR);

      for (const dir of skillDirs) {
        const skillPath = path.join(SKILLS_DIR, dir, "SKILL.md");
        try {
          await fs.access(skillPath);
          const content = await fs.readFile(skillPath, "utf-8");

          // 解析 frontmatter
          const match = content.match(/^---\n([\s\S]*?)\n---/);
          if (match) {
            const frontmatter = match[1];
            const nameMatch = frontmatter.match(/name:\s*(.+)/);
            const descMatch = frontmatter.match(/description:\s*(.+)/);

            skills.push({
              name: nameMatch ? nameMatch[1].trim() : dir,
              description: descMatch ? descMatch[1].trim() : "",
              category: "llm",
              enabled: enabledSkills.includes(dir),
            });
          }
        } catch {
          // 没有 SKILL.md 文件，跳过
        }
      }
    } catch {
      // skills 目录不存在，返回空列表
    }

    return NextResponse.json(skills);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * 切换技能启用状态
 * PUT /api/skills
 */
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { skillName, enabled } = body;

    if (!skillName) {
      return NextResponse.json({ error: "缺少技能名称" }, { status: 400 });
    }

    const ENABLED_SKILLS_FILE = path.join(process.cwd(), ".opencode", "enabled-skills.json");

    // 读取当前配置
    let config: { enabledSkills: string[] } = { enabledSkills: [] };
    try {
      const content = await fs.readFile(ENABLED_SKILLS_FILE, "utf-8");
      config = JSON.parse(content);
    } catch {
      // 文件不存在，创建新配置
    }

    // 更新启用的技能列表
    if (enabled) {
      if (!config.enabledSkills.includes(skillName)) {
        config.enabledSkills.push(skillName);
      }
    } else {
      config.enabledSkills = config.enabledSkills.filter((s) => s !== skillName);
    }

    // 保存配置
    await fs.writeFile(ENABLED_SKILLS_FILE, JSON.stringify(config, null, 2), "utf-8");

    return NextResponse.json({
      skillName,
      enabled,
      enabledSkills: config.enabledSkills,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
