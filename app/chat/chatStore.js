export function createChatStore({ chatLogEl, entries }) {
  if (!Array.isArray(entries)) {
    throw new Error("chat entries must be an array");
  }

  pruneSystemConnectionMessages(entries);
  entries.forEach((entry) => renderChatEntry(chatLogEl, entry));

  return {
    entries,
    addEntry(entry) {
      entries.push(entry);
      renderChatEntry(chatLogEl, entry);
    },
    addTransientEntry(entry) {
      renderChatEntry(chatLogEl, entry);
    },
    clear() {
      entries.length = 0;
      chatLogEl.textContent = "";
    },
  };
}

function renderChatEntry(chatLogEl, entry) {
  const node = document.createElement("div");
  node.className = `chat-entry ${entry.role}`;
  const meta = document.createElement("div");
  meta.className = "meta";
  meta.textContent = String(entry.role || "").replace("_", " ");
  const bubble = document.createElement("div");
  bubble.className = "bubble";
  bubble.textContent = typeof entry.content === "string" ? entry.content : "";
  node.append(meta, bubble);
  chatLogEl.appendChild(node);
  chatLogEl.scrollTop = chatLogEl.scrollHeight;
}

function pruneSystemConnectionMessages(list) {
  const keep = list.filter((entry) => {
    const text = typeof entry?.content === "string" ? entry.content : "";
    if (text.startsWith("Connected to Codex server at ")) return false;
    if (text === "Codex server disconnected.") return false;
    if (text.startsWith("Unable to reach Codex server at ")) return false;
    return true;
  });
  list.length = 0;
  keep.forEach((entry) => list.push(entry));
}
