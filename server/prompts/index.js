import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const promptCache = new Map();

export function loadPromptMarkdown(name) {
  if (promptCache.has(name)) return promptCache.get(name);
  const filePath = path.join(__dirname, `${name}.md`);
  const text = fs.readFileSync(filePath, "utf8").trim();
  promptCache.set(name, text);
  return text;
}

export function renderPromptMarkdown(name, values = {}) {
  return loadPromptMarkdown(name).replace(/\{\{([a-zA-Z0-9_]+)\}\}/g, (_match, key) => {
    const value = values[key];
    return value == null ? "" : String(value);
  });
}
