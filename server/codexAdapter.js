import OpenAI from "openai";
import { normalizeActions, randomId } from "../shared/protocol.js";
import { loadPromptMarkdown } from "./prompts/index.js";

const MODEL = process.env.CODEX_MODEL || "gpt-5";
const SYSTEM_PROMPT = loadPromptMarkdown("world-system");
const LOCAL_WORLD_COMMAND_CAPABILITIES = Object.freeze([
  {
    pattern: "/world ...",
    routeHint: "World command handler for local runtime commands (help, biome teleport, biome style changes).",
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
    { role: "system", content: SYSTEM_PROMPT },
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
  const onlyLocalFrontendCommands =
    normalized.actions.length > 0 &&
    normalized.actions.every((action) => action.type === "run_local_world_command");
  return { ok: true, taskComplete: true, skipSoftRefresh: onlyLocalFrontendCommands };
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
