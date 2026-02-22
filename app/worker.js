const canned = [
  "Scanning terrain systems and build hooks...",
  "Synthesizing possible changes to world generator...",
  "Preparing live patch without restarting runtime...",
];

self.onmessage = (event) => {
  const payload = event.data;
  if (payload.type !== "message") return;
  const { message } = payload;
  const thinking = canned[Math.floor(Math.random() * canned.length)];
  self.postMessage({ type: "thinking", content: thinking });

  setTimeout(() => {
    const response =
      "Acknowledged. I will translate this into build steps and apply updates without resetting your position. " +
      "(This is a simulated Codex response — wire a real bridge to apply code changes.)";
    self.postMessage({ type: "output", content: response });

    if (/seed|terrain|new world/i.test(message)) {
      const newSeed = Math.floor(Math.random() * 1e9);
      self.postMessage({ type: "update", update: { seed: newSeed, chatNote: `Terrain seed updated to ${newSeed}.` } });
    }
    if (/tree|forest|woods/i.test(message)) {
      self.postMessage({
        type: "update",
        update: {
          actions: [{ type: "set_trees", density: 0.34 }],
          chatNote: "Added more trees across nearby terrain.",
        },
      });
    }
  }, 1200);
};
