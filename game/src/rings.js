// Rings: the 10 named gates of the course + the rescue point. A ring is a torus the
// aircraft flies through; passing one is scored in world.js. Rings change colour
// once passed (orange = next, green = done) so the course reads at a glance.
import * as THREE from 'three';
import { RINGS } from './config.js';
import { distTo } from './flight.js';
import { passRing } from './world.js';

export function buildRings(scene) {
  const group = new THREE.Group();
  group.name = 'rings';
  const geo = new THREE.TorusGeometry(1, 0.09, 10, 40);
  const meshes = RINGS.map((ring, i) => {
    const mat = new THREE.MeshBasicMaterial({ color: i === 0 ? 0xff7a1a : 0xff9a3d });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.scale.setScalar(ring.r);
    mesh.position.set(ring.x, ring.y, ring.z);
    // Face the ring toward the previous ring (so the pilot flies through it).
    const prev = RINGS[(i + RINGS.length - 1) % RINGS.length];
    mesh.lookAt(prev.x, prev.y, prev.z);
    mesh.name = `ring-${i + 1}-${ring.name.toLowerCase().replace(/ /g, '-')}`;
    mesh.userData.ringIndex = i;
    group.add(mesh);
    // A small beacon light on top of each ring.
    const beacon = new THREE.Mesh(
      new THREE.SphereGeometry(2.2, 8, 6),
      new THREE.MeshBasicMaterial({ color: 0xffd23d }),
    );
    beacon.position.set(ring.x, ring.y + ring.r + 2, ring.z);
    group.add(beacon);
    return mesh;
  });
  scene.add(group);
  return { group, meshes };
}

/** Check the next ring: flown through it (within radius, crossing the plane)? */
export function checkRings(flight, world, rings) {
  if (world.nextRing >= RINGS.length) return false;
  const ring = RINGS[world.nextRing];
  const d = distTo(flight, ring);
  if (d < ring.r * 0.85) {
    passRing(world);
    // Recolour: passed = green, next = bright orange.
    rings.meshes.forEach((m, i) => {
      m.material.color.setHex(i < world.nextRing ? 0x2ecc71 : i === world.nextRing ? 0xff7a1a : 0xff9a3d);
    });
    return true;
  }
  return false;
}

/** Bearing + distance to the next ring, for the HUD arrow. */
export function nextRingInfo(flight, world) {
  if (world.nextRing >= RINGS.length) return null;
  const ring = RINGS[world.nextRing];
  const dx = ring.x - flight.x;
  const dz = ring.z - flight.z;
  const dist = Math.round(Math.sqrt(dx * dx + dz * dz + (ring.y - flight.y) ** 2));
  // Bearing relative to the nose: 0 = dead ahead, + = right.
  const absBearing = Math.atan2(-dx, -dz); // 0 = north (-Z)
  let rel = absBearing - flight.heading;
  while (rel > Math.PI) rel -= Math.PI * 2;
  while (rel < -Math.PI) rel += Math.PI * 2;
  return { name: ring.name, dist, rel, dy: Math.round(ring.y - flight.y) };
}
