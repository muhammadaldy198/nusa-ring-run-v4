// FIRE OPS: the ridge fire the pilot has to contain. Fire is a set of flame cones +
// smoke columns on the east ridge; it spreads slowly while uncontained and the town
// threat climbs with it. A water drop from low altitude contains a big slice of it —
// the drop-height decision (low = effective, risky) is a real K2 choice.
import * as THREE from 'three';
import { FIRE_ZONE } from './config.js';
import { heightAt } from './terrain.js';
import { dropWater } from './world.js';

export function buildFire(scene, rng) {
  const group = new THREE.Group();
  group.name = 'fire-ops';
  const flameMat = new THREE.MeshBasicMaterial({ color: 0xff5a1a });
  const flameMat2 = new THREE.MeshBasicMaterial({ color: 0xffc21a });
  const smokeMat = new THREE.MeshLambertMaterial({ color: 0x555555, transparent: true, opacity: 0.5 });
  const flames = [];
  const smokes = [];
  for (let i = 0; i < 26; i += 1) {
    const a = rng() * Math.PI * 2;
    const r = rng() * FIRE_ZONE.radius * 0.8;
    const x = FIRE_ZONE.x + Math.cos(a) * r;
    const z = FIRE_ZONE.z + Math.sin(a) * r;
    const y = heightAt(x, z);
    const h = 14 + rng() * 22;
    const flame = new THREE.Mesh(new THREE.ConeGeometry(6 + rng() * 5, h, 6), rng() > 0.5 ? flameMat : flameMat2);
    flame.position.set(x, y + h / 2, z);
    flame.name = 'flame';
    group.add(flame);
    flames.push(flame);
    if (i % 2 === 0) {
      const smoke = new THREE.Mesh(new THREE.SphereGeometry(10 + rng() * 8, 7, 5), smokeMat);
      smoke.position.set(x, y + h + 14, z);
      smoke.scale.y = 1.8;
      smoke.name = 'fire-smoke';
      group.add(smoke);
      smokes.push(smoke);
    }
  }
  // Scorched ground: a dark disc under the fire (muted brown-black, not a hole).
  const scorch = new THREE.Mesh(
    new THREE.CircleGeometry(FIRE_ZONE.radius * 0.8, 28),
    new THREE.MeshLambertMaterial({ color: 0x2e2118 }),
  );
  scorch.rotation.x = -Math.PI / 2;
  scorch.position.set(FIRE_ZONE.x, heightAt(FIRE_ZONE.x, FIRE_ZONE.z) + 0.8, FIRE_ZONE.z);
  scorch.name = 'scorch';
  group.add(scorch);
  scene.add(group);
  return { group, flames, smokes };
}

/** The fire spreads while the pilot is elsewhere: threat climbs, containment stalls. */
export function tickFire(world, dt, fire) {
  if (world.screen !== 1) return;
  if (world.phase === 2 && world.fireContained < 100) {
    world.townThreat = Math.min(96, world.townThreat + dt * 0.25);
  }
  // Flames flicker (scale only — deterministic in staged shots, time-driven live).
  const t = world.time;
  fire.flames.forEach((f, i) => {
    const s = 1 + Math.sin(t * 6 + i * 1.7) * 0.12;
    f.scale.set(s, 1 + Math.sin(t * 9 + i) * 0.15, s);
  });
}

/**
 * Drop water: only counts over the fire zone and below 600 ft. Returns the
 * containment gain (0 when the drop misses or the tank is empty).
 */
export function tryDrop(flight, world) {
  const dx = flight.x - FIRE_ZONE.x;
  const dz = flight.z - FIRE_ZONE.z;
  const over = Math.sqrt(dx * dx + dz * dz) < FIRE_ZONE.radius + 60;
  const altFt = Math.round((flight.y - heightAt(flight.x, flight.z)) * 3.28);
  if (!over || altFt > 600) {
    world.message = over ? 'TERLALU TINGGI — DROP DI BAWAH 600 FT' : 'BUKAN DI ATAS API';
    world.messageSec = 2;
    return 0;
  }
  return dropWater(world, altFt);
}
