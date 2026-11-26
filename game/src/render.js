// Render: the Three.js scene — golden-hour sky, sun, clouds, eagles, warm haze.
// One style across terrain and sky (K4): the same warm dusk palette everywhere,
// so the frame reads as one place, not a sky pasted over a ground.
import * as THREE from 'three';
import { createRandom } from './random.js';
import { SEED } from './config.js';

export function buildSky(scene, rng) {
  // Gradient dome: warm orange at the horizon, deep violet-blue at the zenith.
  const skyGeo = new THREE.SphereGeometry(9000, 24, 16);
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {},
    vertexShader: `
      varying vec3 vPos;
      void main() {
        vPos = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: `
      varying vec3 vPos;
      void main() {
        float h = normalize(vPos).y;
        vec3 horizon = vec3(1.0, 0.62, 0.32);
        vec3 mid = vec3(0.55, 0.42, 0.55);
        vec3 zenith = vec3(0.13, 0.18, 0.38);
        vec3 c = h > 0.25 ? mix(mid, zenith, (h - 0.25) / 0.75) : mix(horizon, mid, h / 0.25 + 0.0);
        if (h < 0.0) c = mix(horizon, vec3(0.35, 0.25, 0.3), -h * 3.0);
        gl_FragColor = vec4(c, 1.0);
      }`,
  });
  const sky = new THREE.Mesh(skyGeo, skyMat);
  sky.name = 'sky';
  scene.add(sky);

  // Low sun: a bright disc + glow sprite on the western horizon.
  const sun = new THREE.Mesh(
    new THREE.CircleGeometry(180, 24),
    new THREE.MeshBasicMaterial({ color: 0xffe9b0, fog: false }),
  );
  sun.position.set(-4800, 950, -4200);
  sun.lookAt(0, 0, 0);
  sun.name = 'sun';
  scene.add(sun);

  // Clouds: flattened white ellipsoids in the upper band — the cover's top strip
  // must be busy, never an empty gradient (v3's 40% empty sky, fixed here).
  // Unlit basic material: clouds stay bright white-gold against the dusk sky.
  const cloudMat = new THREE.MeshBasicMaterial({ color: 0xfff3df, transparent: true, opacity: 0.94 });
  const clouds = new THREE.Group();
  clouds.name = 'clouds';
  for (let i = 0; i < 26; i += 1) {
    const cluster = new THREE.Group();
    const puffs = 3 + Math.floor(rng() * 3);
    for (let j = 0; j < puffs; j += 1) {
      const puff = new THREE.Mesh(new THREE.SphereGeometry(38 + rng() * 42, 8, 6), cloudMat);
      puff.position.set((rng() - 0.5) * 160, (rng() - 0.5) * 22, (rng() - 0.5) * 60);
      puff.scale.y = 0.42;
      cluster.add(puff);
    }
    // Spread across the sky, biased high so the top of the frame is filled.
    const a = rng() * Math.PI * 2;
    const r = 1200 + rng() * 2600;
    cluster.position.set(Math.cos(a) * r, 420 + rng() * 320, Math.sin(a) * r);
    clouds.add(cluster);
  }
  scene.add(clouds);

  // Eagles: a V formation of four, circling high — the living detail of the sky.
  const eagleMat = new THREE.MeshBasicMaterial({ color: 0x2a2018, side: THREE.DoubleSide });
  const eagles = new THREE.Group();
  eagles.name = 'eagles';
  const wingGeo = new THREE.PlaneGeometry(9, 2.6);
  for (let i = 0; i < 4; i += 1) {
    const bird = new THREE.Group();
    const wl = new THREE.Mesh(wingGeo, eagleMat);
    wl.position.x = -4.6;
    wl.rotation.z = 0.25;
    const wr = new THREE.Mesh(wingGeo, eagleMat);
    wr.position.x = 4.6;
    wr.rotation.z = -0.25;
    bird.add(wl, wr);
    const off = (i - 1.5) * 26;
    bird.position.set(off, Math.abs(off) * 0.4, off * 0.9);
    eagles.add(bird);
  }
  eagles.position.set(-500, 330, -900);
  scene.add(eagles);

  // Warm haze so distant terrain melts into the sky instead of ending in a hard edge.
  scene.fog = new THREE.Fog(0xe8a06a, 1600, 6200);
  return { sky, clouds, eagles };
}

export function createScene(seed) {
  const rng = createRandom(seed ?? SEED);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x2a2338);
  const camera = new THREE.PerspectiveCamera(62, 1280 / 720, 0.5, 12000);
  camera.position.set(0, 60, 80);
  // Golden-hour key light (low from the west) + soft sky fill.
  const sun = new THREE.DirectionalLight(0xffd9a0, 1.35);
  sun.position.set(-4000, 900, -1500);
  scene.add(sun);
  const hemi = new THREE.HemisphereLight(0x8fa3c7, 0x5a4a33, 0.85);
  scene.add(hemi);
  const sky = buildSky(scene, rng);
  return { scene, camera, rng, ...sky };
}
