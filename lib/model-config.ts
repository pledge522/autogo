/**
 * 模型配置管理
 * 从 secret.txt 读取多个模型配置，默认使用第一个
 */

import { readFileSync } from "fs";
import { join } from "path";

export interface ModelConfig {
  name: string;
  url: string;
  apiKey: string;
}

const SECRET_FILE = join(process.cwd(), "secret.txt");

/**
 * 解析 secret.txt 文件
 * 格式:
 *   model:<name>
 *   url:<url>
 *   sk:<apiKey>
 *
 *   (空行分隔不同模型)
 */
export function parseSecretFile(): ModelConfig[] {
  const models: ModelConfig[] = [];

  try {
    const content = readFileSync(SECRET_FILE, "utf-8");
    const blocks = content.trim().split(/\n\s*\n/); // 空行分隔

    for (const block of blocks) {
      const lines = block.trim().split("\n");
      const config: Record<string, string> = {};

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;

        const [key, ...valueParts] = trimmed.split(":");
        if (key && valueParts.length > 0) {
          config[key.trim()] = valueParts.join(":").trim();
        }
      }

      if (config.model && config.url && config.sk) {
        models.push({
          name: config.model,
          url: config.url,
          apiKey: config.sk,
        });
      }
    }
  } catch (err) {
    console.error("读取 secret.txt 失败:", err);
  }

  return models;
}

/**
 * 获取默认模型（第一个）
 */
export function getDefaultModel(): ModelConfig | null {
  const models = parseSecretFile();
  return models.length > 0 ? models[0] : null;
}

/**
 * 根据名称获取模型
 */
export function getModelByName(name: string): ModelConfig | null {
  const models = parseSecretFile();
  return models.find(m => m.name === name) || null;
}

/**
 * 获取所有模型列表
 */
export function getAllModels(): ModelConfig[] {
  return parseSecretFile();
}

/**
 * 根据模型 URL 判断 provider 类型
 */
export function getProviderByConfig(modelConfig: ModelConfig): string {
  const url = modelConfig.url.toLowerCase();

  if (url.includes("deepseek.com")) {
    return "deepseek";
  }
  if (url.includes("openai.com")) {
    return "openai";
  }
  if (url.includes("anthropic.com")) {
    return "anthropic";
  }
  if (url.includes("groq.com")) {
    return "groq";
  }
  if (url.includes("hep.com.cn")) {
    return "hep";
  }
  if (url.includes("fireworks.ai")) {
    return "fireworks";
  }
  if (url.includes("together.xyz")) {
    return "togetherai";
  }
  if (url.includes("openrouter.ai")) {
    return "openrouter";
  }

  // 默认使用 openai-compatible
  return "openai-compatible";
}

/**
 * 获取 opencode 使用的 provider ID 和 model ID
 */
export function getOpencodeModelConfig(modelConfig: ModelConfig): { providerID: string; modelID: string } {
  const providerID = getProviderByConfig(modelConfig);
  const modelID = modelConfig.name;

  return { providerID, modelID };
}
