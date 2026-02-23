import OpenAI from "openai";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { normalizeActions, randomId } from "../shared/protocol.js";
import { loadPromptMarkdown } from "./prompts/index.js";

const MODEL = process.env.CODEX_MODEL || "gpt-5";
const SYSTEM_PROMPT = loadPromptMarkdown("world-system");
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const APP_COMMAND_HELP_PATH = path.resolve(__dirname, "../app/commandHelp.json");
let cachedFrontendCommandContextText = null;
const LOCAL_WORLD_COMMAND_CAPABILITIES = Object.freeze([
  {
    pattern: "/world ...",
    routeHint: "World command handler for local runtime commands (help, biome teleport, terrain detail, biome style changes).",
    match: (text) => /^\/world(?:\s|$)/i.test(text),
  },
  {
    pattern: "/time ...",
    routeHint: "Local time command handler (set/show time and time command help/usage).",
    match: (text) => /^\/time(?:\s|$)/i.test(text),
  },
  {
    pattern: "tp ... or /tp ...",
    routeHint: "Local biome teleport shorthand command handler.",
    match: (text) => /^\/?tp\s+.+/i.test(text),
  },
]);

export function getWorldRouterCapabilitiesText() {
  return [
    "Current world-routable command capabilities:",
    ...LOCAL_WORLD_COMMAND_CAPABILITIES.map(
      (capability) => `- ${capability.pattern}: ${capability.routeHint}`
    ),
    "- Natural-language runtime/in-world requests (for example setting time, changing terrain/world state) are also world-routable.",
    "- UI/help panel text, button labels, and frontend code changes are not world capabilities and should route to repo.",
  ].join("\n");
}

function getFrontendCommandHelpContextText() {
  if (cachedFrontendCommandContextText) return cachedFrontendCommandContextText;
  try {
    const raw = fs.readFileSync(APP_COMMAND_HELP_PATH, "utf8");
    const parsed = JSON.parse(raw);
    const commands = Array.isArray(parsed?.commands) ? parsed.commands : [];
    const relevant = commands.filter((entry) =>
      ["frontend", "world", "confirmation"].includes(String(entry?.category || ""))
    );
    const lines = ["Frontend local command catalog (source: app/commandHelp.json):"];
    for (const entry of relevant) {
      const category = String(entry.category || "unknown");
      const id = String(entry.id || "unknown");
      const summaryLines = Array.isArray(entry.summaryLines) ? entry.summaryLines.filter((v) => typeof v === "string") : [];
      if (summaryLines.length === 0) continue;
      lines.push(`- [${category}] ${id}: ${summaryLines.join(" | ")}`);
    }
    cachedFrontendCommandContextText = lines.join("\n");
    return cachedFrontendCommandContextText;
  } catch {
    cachedFrontendCommandContextText = [
      "Frontend local command catalog unavailable (fallback summary).",
      "- /time ...",
      "- /world help|commands|?",
      "- /world biome <biome-name>",
      "- /world tp biome <biome-name>",
      "- /world detail <meters|off>",
      "- /world detail intensity <0..3>",
      "- /world style ... (set/clear/tree forms)",
      "- /tp <biome-name> or tp <biome-name>",
      "- confirmation replies: yes / no",
    ].join("\n");
    return cachedFrontendCommandContextText;
  }
}

function buildWorldSystemPrompt() {
  return [
    SYSTEM_PROMPT,
    getWorldRouterCapabilitiesText(),
    getFrontendCommandHelpContextText(),
  ].join("\n\n");
}

export async function handleCodexMessage(payload, send) {
  const { message, snapshot } = payload;
  const localCommandAction = buildLocalWorldCommandAction(message);
  if (localCommandAction) {
    send({ type: "thinking", content: "Dispatching command to local world handler..." });
    send({
      type: "update",
      update: {
        updateId: randomId("upd"),
        actions: [localCommandAction],
      },
    });
    return { ok: true, taskComplete: true, skipSoftRefresh: true };
  }

  const client = getClient();
  if (!client) {
    send({ type: "output", content: "OPENAI_API_KEY is not set on the server." });
    return { ok: false, taskComplete: false };
  }

  send({ type: "thinking", content: "Codex is planning updates..." });

  const input = [
    { role: "system", content: buildWorldSystemPrompt() },
    {
      role: "user",
      content:
        `Player message: ${message}\n\n` +
        `Snapshot (for context): ${JSON.stringify(snapshot).slice(0, 4000)}`,
    },
  ];

  const stream = await client.responses.create({
    model: MODEL,
    input,
    stream: true,
  });

  let text = "";
  for await (const event of stream) {
    if (event.type === "response.output_text.delta") {
      text += event.delta;
    }
  }

  const parsed = parseModelJson(text);
  if (!parsed.ok) {
    send({
      type: "output",
      content: `Model output parse failed: ${parsed.error}. Raw: ${truncate(text, 800)}`,
    });
    return { ok: false, taskComplete: false };
  }

  const thinking = safeText(parsed.data.thinking);
  const summary = safeText(parsed.data.summary);
  const normalized = normalizeActions(parsed.data.actions);

  if (thinking) {
    send({ type: "thinking", content: thinking });
  }
  if (summary) {
    send({ type: "output", content: summary });
  }
  if (normalized.actions.length > 0) {
    send({
      type: "update",
      update: {
        updateId: randomId("upd"),
        actions: normalized.actions,
        chatNote:
          normalized.rejected.length > 0
            ? `Applied ${normalized.actions.length} action(s). Rejected ${normalized.rejected.length} invalid action(s).`
            : `Applied ${normalized.actions.length} action(s).`,
      },
    });
  } else if (normalized.rejected.length > 0) {
    send({
      type: "output",
      content: `No valid actions generated. Rejected ${normalized.rejected.length} invalid action(s).`,
    });
  }
  // World-route requests apply runtime changes without requiring a page reload.
  return { ok: true, taskComplete: true, skipSoftRefresh: true };
}

function getClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  return new OpenAI({ apiKey });
}

function parseModelJson(raw) {
  if (!raw || !raw.trim()) return { ok: false, error: "empty model output" };
  const text = stripCodeFences(raw.trim());
  try {
    return { ok: true, data: JSON.parse(text) };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

function stripCodeFences(text) {
  const fenced = text.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fenced ? fenced[1] : text;
}

function safeText(value) {
  if (typeof value !== "string") return "";
  return value.trim();
}

function truncate(value, maxLen) {
  if (typeof value !== "string") return "";
  if (value.length <= maxLen) return value;
  return `${value.slice(0, maxLen)}...`;
}

function buildLocalWorldCommandAction(message) {
  const text = typeof message === "string" ? message.trim() : "";
  if (!text) return null;
  if (LOCAL_WORLD_COMMAND_CAPABILITIES.some((capability) => capability.match(text))) {
    return { type: "run_local_world_command", command: text };
  }
  return null;
}
