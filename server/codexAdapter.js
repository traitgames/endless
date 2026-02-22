import OpenAI from "openai";
import { normalizeActions, randomId } from "../shared/protocol.js";

const MODEL = process.env.CODEX_MODEL || "gpt-5";

const SYSTEM_PROMPT = [
  "You are Codex embedded in a realtime 3D world editor.",
  "You must return ONLY JSON and no prose outside JSON.",
  "Use this exact top-level shape:",
  "{\"thinking\":\"string\",\"summary\":\"string\",\"actions\":[{\"type\":\"...\",\"...\":...}]}",
  "Allowed action types and fields:",
  "1) set_seed: {\"type\":\"set_seed\",\"seed\":number}",
  "2) set_terrain: {\"type\":\"set_terrain\",\"noiseScale\":number,\"baseHeight\":number,\"ridgeScale\":number,\"ridgeHeight\":number}",
  "3) set_water: {\"type\":\"set_water\",\"level\":number,\"opacity\":number,\"colorHex\":\"#RRGGBB\"}",
  "4) set_fog: {\"type\":\"set_fog\",\"density\":number,\"colorHex\":\"#RRGGBB\"}",
  "5) set_terrain_color: {\"type\":\"set_terrain_color\",\"colorHex\":\"#RRGGBB\"}",
  "6) set_trees: {\"type\":\"set_trees\",\"density\":number,\"trunkColor\":\"#RRGGBB\",\"canopyColor\":\"#RRGGBB\"}",
  "7) spawn_landmark: {\"type\":\"spawn_landmark\",\"kind\":\"pillar|beacon\",\"x\":number,\"z\":number,\"yOffset\":number,\"scale\":number,\"colorHex\":\"#RRGGBB\"}",
  "8) clear_landmarks: {\"type\":\"clear_landmarks\"}",
  "If no world change is needed, return an empty actions array.",
  "Keep thinking and summary concise.",
].join(" ");

export async function handleCodexMessage(payload, send) {
  const { message, snapshot } = payload;
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
  return { ok: true, taskComplete: true };
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
