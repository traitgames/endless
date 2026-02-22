export function createTraceLogger(traceLogEl, maxEntries = 80) {
  return {
    addTraceEntry(result, action) {
      const node = document.createElement("div");
      node.className = `trace-entry ${result.status}`;
      const meta = document.createElement("div");
      meta.className = "trace-meta";
      meta.textContent = `${result.status} • ${result.type}`;
      const detail = document.createElement("div");
      detail.textContent = result.detail;
      const payload = document.createElement("div");
      payload.className = "trace-payload";
      payload.textContent = safeJson(action);
      node.append(meta, detail, payload);
      append(node);
    },
    addTracePhrase(phrase, status = "info") {
      const normalizedStatus = status === "applied" || status === "rejected" ? status : "info";
      const node = document.createElement("div");
      node.className = `trace-entry ${normalizedStatus}`;
      const meta = document.createElement("div");
      meta.className = "trace-meta";
      meta.textContent = normalizedStatus;
      const detail = document.createElement("div");
      detail.textContent = phrase;
      node.append(meta, detail);
      append(node);
    },
  };

  function append(node) {
    traceLogEl.appendChild(node);
    while (traceLogEl.childElementCount > maxEntries) {
      traceLogEl.removeChild(traceLogEl.firstElementChild);
    }
    traceLogEl.scrollTop = traceLogEl.scrollHeight;
  }
}

function safeJson(value) {
  try {
    return JSON.stringify(value);
  } catch {
    return '{"error":"unserializable action payload"}';
  }
}
