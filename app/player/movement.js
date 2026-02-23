export function updatePlayerRuntime({
  dt,
  keys,
  player,
  heightAt,
  sampleGroundHeight,
  ensureChunks,
  chunkSize,
  xyzEl,
  chunkEl,
  camera,
  Vector3,
}) {
  const speed = keys.has("ShiftLeft") ? 10 : 6;
  const dir = new Vector3();
  if (keys.has("KeyW")) dir.z -= 1;
  if (keys.has("KeyS")) dir.z += 1;
  if (keys.has("KeyA")) dir.x -= 1;
  if (keys.has("KeyD")) dir.x += 1;

  if (dir.lengthSq() > 0) {
    dir.normalize();
    const forward = new Vector3(Math.sin(player.yaw), 0, Math.cos(player.yaw));
    const right = new Vector3(forward.z, 0, -forward.x);
    const move = forward.multiplyScalar(dir.z).add(right.multiplyScalar(dir.x));
    player.velocity.x = move.x * speed;
    player.velocity.z = move.z * speed;
  } else {
    player.velocity.x *= 0.86;
    player.velocity.z *= 0.86;
  }

  if (keys.has("Space") && player.grounded) {
    player.velocity.y = 9;
    player.grounded = false;
  }

  player.velocity.y -= 18 * dt;

  player.position.addScaledVector(player.velocity, dt);

  const groundHeight =
    typeof sampleGroundHeight === "function"
      ? sampleGroundHeight(player.position.x, player.position.z)
      : heightAt(player.position.x, player.position.z);
  const ground = groundHeight + 2.2;
  if (player.position.y <= ground) {
    player.position.y = ground;
    player.velocity.y = 0;
    player.grounded = true;
  }

  if (xyzEl) {
    const formatCoord = (value) => {
      const rounded = Math.round(value * 10) / 10;
      return Object.is(rounded, -0) ? "0.0" : rounded.toFixed(1);
    };
    xyzEl.textContent = `${formatCoord(player.position.x)}, ${formatCoord(player.position.y)}, ${formatCoord(player.position.z)}`;
  }

  const cx = Math.floor(player.position.x / chunkSize);
  const cz = Math.floor(player.position.z / chunkSize);
  if (player._lastChunkX !== cx || player._lastChunkZ !== cz) {
    ensureChunks(cx, cz);
    player._lastChunkX = cx;
    player._lastChunkZ = cz;
    chunkEl.textContent = `${cx},${cz}`;
  }

  camera.position.copy(player.position);
  camera.rotation.set(player.pitch, player.yaw, 0, "YXZ");
}
