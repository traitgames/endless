import OpenAI from "openai";

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
    return;
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
    return;
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

function normalizeActions(actions) {
  const accepted = [];
  const rejected = [];
  const list = Array.isArray(actions) ? actions : [];
  for (const action of list) {
    const normalized = normalizeAction(action);
    if (normalized) accepted.push(normalized);
    else rejected.push(action);
  }
  return { actions: accepted, rejected };
}

function normalizeAction(action) {
  if (!action || typeof action !== "object") return null;
  const type = safeText(action.type);
  if (!type) return null;

  if (type === "set_seed") {
    const seed = toInt(action.seed);
    if (seed === null) return null;
    return { type, seed };
  }

  if (type === "set_terrain") {
    const out = { type };
    maybeNumber(action, out, "noiseScale");
    maybeNumber(action, out, "baseHeight");
    maybeNumber(action, out, "ridgeScale");
    maybeNumber(action, out, "ridgeHeight");
    return Object.keys(out).length > 1 ? out : null;
  }

  if (type === "set_water") {
    const out = { type };
    maybeNumber(action, out, "level");
    maybeNumber(action, out, "opacity");
    maybeColor(action, out, "colorHex");
    return Object.keys(out).length > 1 ? out : null;
  }

  if (type === "set_fog") {
    const out = { type };
    maybeNumber(action, out, "density");
    maybeColor(action, out, "colorHex");
    return Object.keys(out).length > 1 ? out : null;
  }

  if (type === "set_terrain_color") {
    const colorHex = toColor(action.colorHex);
    if (!colorHex) return null;
    return { type, colorHex };
  }

  if (type === "set_trees") {
    const out = { type };
    maybeNumber(action, out, "density");
    maybeColor(action, out, "trunkColor");
    maybeColor(action, out, "canopyColor");
    return Object.keys(out).length > 1 ? out : null;
  }

  if (type === "spawn_landmark") {
    const kind = safeText(action.kind);
    if (kind !== "pillar" && kind !== "beacon") return null;
    const out = { type, kind };
    maybeNumber(action, out, "x");
    maybeNumber(action, out, "z");
    maybeNumber(action, out, "yOffset");
    maybeNumber(action, out, "scale");
    maybeColor(action, out, "colorHex");
    if (typeof out.x !== "number") out.x = 0;
    if (typeof out.z !== "number") out.z = 0;
    return out;
  }

  if (type === "clear_landmarks") {
    return { type };
  }

  return null;
}

function maybeNumber(src, target, key) {
  const value = toNumber(src[key]);
  if (value !== null) target[key] = value;
}

function maybeColor(src, target, key) {
  const value = toColor(src[key]);
  if (value) target[key] = value;
}

function toNumber(value) {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return value;
}

function toInt(value) {
  const n = toNumber(value);
  if (n === null) return null;
  return Math.trunc(n);
}

function toColor(value) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!/^#[0-9a-fA-F]{6}$/.test(trimmed)) return null;
  return trimmed.toLowerCase();
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
