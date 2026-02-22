import { normalizeUpdate } from "../shared/protocol.js";

export function createUpdateEngine(options) {
  const {
    applyAction,
    snapshot,
    restore,
    onTrace,
    onChatNote,
    maxSeenUpdateIds = 200,
  } = options;

  const seenUpdateIds = new Set();
  const seenQueue = [];

  return {
    applyUpdate,
  };

  function applyUpdate(rawUpdate) {
    const normalized = normalizeUpdate(rawUpdate);
    if (!normalized.ok) {
      return {
        ok: false,
        skipped: false,
        reason: normalized.error,
        appliedCount: 0,
        totalCount: 0,
        rejectedCount: 0,
        updateId: "",
      };
    }

    const update = normalized.data;
    if (seenUpdateIds.has(update.updateId)) {
      return {
        ok: true,
        skipped: true,
        reason: "duplicate_update",
        appliedCount: 0,
        totalCount: update.actions.length,
        rejectedCount: normalized.rejected.length,
        updateId: update.updateId,
      };
    }

    const stateSnapshot = snapshot();
    const results = [];

    try {
      for (const action of update.actions) {
        const result = applyAction(action);
        results.push(result);
        if (onTrace) onTrace(result, action);
      }
    } catch (err) {
      restore(stateSnapshot);
      return {
        ok: false,
        skipped: false,
        reason: `apply_failed:${err.message}`,
        appliedCount: 0,
        totalCount: update.actions.length,
        rejectedCount: normalized.rejected.length,
        updateId: update.updateId,
      };
    }

    rememberUpdateId(update.updateId);

    if (update.chatNote && onChatNote) {
      onChatNote(update.chatNote);
    }

    const appliedCount = results.filter((entry) => entry.status === "applied").length;
    return {
      ok: true,
      skipped: false,
      reason: "",
      appliedCount,
      totalCount: update.actions.length,
      rejectedCount: normalized.rejected.length,
      updateId: update.updateId,
    };
  }

  function rememberUpdateId(updateId) {
    seenUpdateIds.add(updateId);
    seenQueue.push(updateId);
    while (seenQueue.length > maxSeenUpdateIds) {
      const oldest = seenQueue.shift();
      seenUpdateIds.delete(oldest);
    }
  }
}
