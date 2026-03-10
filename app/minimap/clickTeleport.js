export function mapMinimapClickToWorld(event, canvas, centerX, centerZ, worldRadius) {
  if (!event || !canvas) return null;
  if (!Number.isFinite(centerX) || !Number.isFinite(centerZ) || !(worldRadius > 0)) return null;

  const rect = canvas.getBoundingClientRect();
  if (!rect || !(rect.width > 0) || !(rect.height > 0)) return null;

  const localX = event.clientX - rect.left;
  const localY = event.clientY - rect.top;
  if (localX < 0 || localX > rect.width || localY < 0 || localY > rect.height) {
    return null;
  }

  const span = worldRadius * 2;
  const ratioX = localX / rect.width;
  const ratioY = localY / rect.height;

  return {
    x: centerX - worldRadius + ratioX * span,
    z: centerZ - worldRadius + ratioY * span,
  };
}
