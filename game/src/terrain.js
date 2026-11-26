// Terrain: one procedural island chain, golden hour, from a fixed seed. The height
// function is pure math (no THREE) so the flight model reads the exact same ground
// the mesh shows — a landing the mesh shows flat is flat in the model too.
import * as THREE from 'three';
import { fbm } from './random.js';
import { LAKE, LIGHTHOUSE, MARKET, RUNWAY, VILLAGE, VOLCANO, WORLD_SIZE } from './config.js';

const HALF = WORLD_SIZE / 2;

/** Ground height in metres at (x, z). Shared by mesh + flight model + staging. */
export function heightAt(x, z) {
  const r = Math.sqrt(x * x + z * z);
  // Island falloff: land inside ~2300 m, sea beyond.
  const fall = Math.max(0, 1 - Math.pow(Math.max(0, r - 1500) / 900, 2));
  let h = fbm((x + 4000) / 900, (z + 4000) / 900) * 95 * fall;
  // Rolling hills in the middle.
  h += fbm((x + 9000) / 420, (z + 9000) / 420) * 38 * fall;
  // Volcano cone.
  const dv = Math.sqrt((x - VOLCANO.x) ** 2 + (z - VOLCANO.z) ** 2);
  h += Math.max(0, VOLCANO.height * (1 - dv / VOLCANO.radius)) * (dv < VOLCANO.radius ? 1 : 0);
  // Lake bowl: below the lake water level so the lake plane shows.
  const dl = Math.sqrt((x - LAKE.x) ** 2 + (z - LAKE.z) ** 2);
  if (dl < LAKE.radius) h = Math.min(h, 2 - (1 - dl / LAKE.radius) * 6);
  // Runway plateau: flat strip so landings read true — plus the approach
  // valley south of it. A legal landing needs a low, flat final, and the
  // hills that stood on the centreline (50-64 m) made every approach crash
  // into terrain; the valley fades from full-flat at the threshold to natural
  // ground 700 m south, so the island keeps its hills everywhere else.
  if (Math.abs(x - RUNWAY.x) < 60 && z > RUNWAY.zMin - 120 && z < 700) {
    const tx = Math.min(1, (60 - Math.abs(x - RUNWAY.x)) / 20);
    const tz = z <= RUNWAY.zMax + 120
      ? 1
      : Math.max(0, 1 - (z - (RUNWAY.zMax + 120)) / (700 - (RUNWAY.zMax + 120)));
    const t = tx * tz;
    h = h * (1 - t) + 6 * t;
  }
  return Math.max(-6, h);
}

function groundColor(x, z, h, rng) {
  // Sand near the water, grass, forest, rock on the volcano, terraces on the west slope.
  const r = Math.sqrt(x * x + z * z);
  // A river winding north-south through the middle: a blue ribbon that reads from
  // the air and anchors the terrain (the island's recognisable spine).
  const riverX = 200 + 150 * Math.sin(z / 400);
  if (Math.abs(x - riverX) < 16 && h < 32 && h > 2.5) return [0.3, 0.55, 0.62];
  if (h < 2.5) return [0.76, 0.7, 0.52]; // beach sand
  if (r > 2250) return [0.25, 0.42, 0.25]; // shore scrub
  const dv = Math.sqrt((x - VOLCANO.x) ** 2 + (z - VOLCANO.z) ** 2);
  if (dv < 260) return [0.32, 0.3, 0.3]; // volcano rock
  if (dv < 520) return [0.45, 0.38, 0.32]; // ash slope
  // Rice terraces: stepped bands on the west slope.
  if (x < -500 && x > -1100 && z > -1100 && z < -500) {
    const band = Math.floor(h / 8) % 2 === 0;
    return band ? [0.32, 0.58, 0.25] : [0.5, 0.66, 0.3];
  }
  const n = fbm((x + 2000) / 260, (z + 2000) / 260);
  if (n > 0.62) return [0.16, 0.38, 0.18]; // forest
  return [0.35, 0.55, 0.26]; // grass
}

export function buildTerrain(scene, rng) {
  const group = new THREE.Group();
  group.name = 'terrain';
  const SEG = 180;
  const geo = new THREE.PlaneGeometry(WORLD_SIZE, WORLD_SIZE, SEG, SEG);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i += 1) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const h = heightAt(x, z);
    pos.setY(i, h);
    const c = groundColor(x, z, h, rng);
    colors[i * 3] = c[0];
    colors[i * 3 + 1] = c[1];
    colors[i * 3 + 2] = c[2];
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  const land = new THREE.Mesh(
    geo,
    new THREE.MeshLambertMaterial({ vertexColors: true }),
  );
  land.name = 'island';
  group.add(land);

  // Sea (one big plane, golden-hour blue-green) and the lake.
  const sea = new THREE.Mesh(
    new THREE.PlaneGeometry(WORLD_SIZE * 3, WORLD_SIZE * 3),
    new THREE.MeshLambertMaterial({ color: 0x2e6f7a }),
  );
  sea.rotation.x = -Math.PI / 2;
  sea.position.y = 0;
  sea.name = 'sea';
  group.add(sea);
  const lake = new THREE.Mesh(
    new THREE.CircleGeometry(LAKE.radius, 40),
    new THREE.MeshLambertMaterial({ color: 0x4d8ea0 }),
  );
  lake.rotation.x = -Math.PI / 2;
  lake.position.set(LAKE.x, 8, LAKE.z);
  lake.name = 'danau-nusa';
  group.add(lake);

  // Volcano smoke: a few soft grey spheres drifting (static in staged shots).
  const smokeMat = new THREE.MeshLambertMaterial({ color: 0x9a9a9a, transparent: true, opacity: 0.55 });
  for (let i = 0; i < 5; i += 1) {
    const puff = new THREE.Mesh(new THREE.SphereGeometry(26 + rng() * 18, 8, 6), smokeMat);
    puff.position.set(VOLCANO.x + (rng() - 0.5) * 90, VOLCANO.height + 30 + i * 26, VOLCANO.z + (rng() - 0.5) * 90);
    puff.scale.y = 0.6;
    puff.name = 'volcano-smoke';
    group.add(puff);
  }

  // Runway: dark strip + centreline dashes + threshold bars, flat on the plateau.
  const rw = new THREE.Group();
  rw.name = 'runway-nusa';
  const strip = new THREE.Mesh(
    new THREE.PlaneGeometry(RUNWAY.width, RUNWAY.zMax - RUNWAY.zMin),
    new THREE.MeshLambertMaterial({ color: 0x2b2b2e }),
  );
  strip.rotation.x = -Math.PI / 2;
  strip.position.set(RUNWAY.x, 6.4, (RUNWAY.zMin + RUNWAY.zMax) / 2);
  rw.add(strip);
  const lineMat = new THREE.MeshBasicMaterial({ color: 0xf5f5f5 });
  for (let z = RUNWAY.zMin + 40; z < RUNWAY.zMax - 20; z += 60) {
    const dash = new THREE.Mesh(new THREE.PlaneGeometry(2.5, 30), lineMat);
    dash.rotation.x = -Math.PI / 2;
    dash.position.set(RUNWAY.x, 6.6, z);
    rw.add(dash);
  }
  for (const z of [RUNWAY.zMin + 12, RUNWAY.zMax - 12]) {
    const bar = new THREE.Mesh(new THREE.PlaneGeometry(RUNWAY.width - 8, 6), lineMat);
    bar.rotation.x = -Math.PI / 2;
    bar.position.set(RUNWAY.x, 6.6, z);
    rw.add(bar);
  }
  // Edge lights: small amber dots down both sides.
  const lightMat = new THREE.MeshBasicMaterial({ color: 0xffb020 });
  for (let z = RUNWAY.zMin; z <= RUNWAY.zMax; z += 75) {
    for (const x of [-RUNWAY.width / 2 + 2, RUNWAY.width / 2 - 2]) {
      const dot = new THREE.Mesh(new THREE.SphereGeometry(1.0, 6, 4), lightMat);
      dot.position.set(RUNWAY.x + x, 7.2, z);
      rw.add(dot);
    }
  }
  group.add(rw);

  // Fishing village: stilt houses + boats on the southwest bay.
  const houseWall = new THREE.MeshLambertMaterial({ color: 0xd8c49a });
  const houseRoof = new THREE.MeshLambertMaterial({ color: 0xa34d2d });
  for (let i = 0; i < 12; i += 1) {
    const hx = VILLAGE.x + (rng() - 0.5) * 260;
    const hz = VILLAGE.z + (rng() - 0.5) * 180;
    const hy = Math.max(2, heightAt(hx, hz));
    const house = new THREE.Group();
    const walls = new THREE.Mesh(new THREE.BoxGeometry(14, 9, 12), houseWall);
    walls.position.y = 4.5;
    const roof = new THREE.Mesh(new THREE.ConeGeometry(11, 6, 4), houseRoof);
    roof.position.y = 12;
    roof.rotation.y = Math.PI / 4;
    house.add(walls, roof);
    house.position.set(hx, hy, hz);
    house.name = 'village-house';
    group.add(house);
  }
  // Boats: hull + sail, in the bay and at the floating market.
  const hullMat = new THREE.MeshLambertMaterial({ color: 0x7a4a22 });
  const sailMat = new THREE.MeshLambertMaterial({ color: 0xf2e6c8, side: THREE.DoubleSide });
  const boatSpots = [
    ...Array.from({ length: 6 }, () => [VILLAGE.x + (rng() - 0.5) * 300, VILLAGE.z + 120 + rng() * 160]),
    ...Array.from({ length: 8 }, () => [MARKET.x + (rng() - 0.5) * 200, MARKET.z + (rng() - 0.5) * 160]),
  ];
  for (const [bx, bz] of boatSpots) {
    const boat = new THREE.Group();
    const hull = new THREE.Mesh(new THREE.BoxGeometry(16, 3, 5), hullMat);
    hull.position.y = 1.5;
    const sail = new THREE.Mesh(new THREE.PlaneGeometry(9, 11), sailMat);
    sail.position.set(0, 9, 0);
    sail.rotation.y = rng() * Math.PI;
    boat.add(hull, sail);
    boat.position.set(bx, 0.5, bz);
    boat.name = 'boat';
    group.add(boat);
  }

  // Lighthouse on the west headland: white/red bands + beam cone.
  const lh = new THREE.Group();
  lh.name = 'lighthouse';
  const lhBase = heightAt(LIGHTHOUSE.x, LIGHTHOUSE.z);
  const tower = new THREE.Mesh(
    new THREE.CylinderGeometry(7, 9, 42, 10),
    new THREE.MeshLambertMaterial({ color: 0xf2f2f2 }),
  );
  tower.position.y = 21;
  const band = new THREE.Mesh(
    new THREE.CylinderGeometry(7.4, 7.4, 6, 10),
    new THREE.MeshLambertMaterial({ color: 0xc23b2a }),
  );
  band.position.y = 30;
  const lamp = new THREE.Mesh(
    new THREE.SphereGeometry(4, 10, 8),
    new THREE.MeshBasicMaterial({ color: 0xffe9a8 }),
  );
  lamp.position.y = 44;
  lh.add(tower, band, lamp);
  lh.position.set(LIGHTHOUSE.x, lhBase, LIGHTHOUSE.z);
  group.add(lh);

  // Trees: two instanced meshes (trunks + canopies), seeded positions on grass.
  const trunkGeo = new THREE.CylinderGeometry(1.2, 1.8, 9, 5);
  const canopyGeo = new THREE.ConeGeometry(7, 16, 6);
  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x5d4126 });
  const canopyMat = new THREE.MeshLambertMaterial({ color: 0x1f4d22 });
  const spots = [];
  let guard = 0;
  while (spots.length < 800 && guard < 9000) {
    guard += 1;
    const x = (rng() - 0.5) * 4400;
    const z = (rng() - 0.5) * 4400;
    const h = heightAt(x, z);
    if (h < 5 || h > 130) continue;
    if (Math.abs(x) < 90 && z > RUNWAY.zMin - 150 && z < 700) continue; // keep the strip + valley clear
    spots.push([x, h, z]);
  }
  const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, spots.length);
  const canopies = new THREE.InstancedMesh(canopyGeo, canopyMat, spots.length);
  const m = new THREE.Matrix4();
  spots.forEach(([x, h, z], i) => {
    const s = 0.8 + rng() * 0.7;
    m.makeScale(s, s, s);
    m.setPosition(x, h + 4.5 * s, z);
    trunks.setMatrixAt(i, m);
    m.makeScale(s, s, s);
    m.setPosition(x, h + (9 + 8) * s * 0.9, z);
    canopies.setMatrixAt(i, m);
  });
  trunks.name = 'trees-trunk';
  canopies.name = 'trees-canopy';
  group.add(trunks, canopies);

  scene.add(group);
  return group;
}
