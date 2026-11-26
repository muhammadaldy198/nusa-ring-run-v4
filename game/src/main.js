// Boot and the one loop: input every frame, the world advances in fixed 1/60 s steps,
// and the renderer + HUD paint what is there. Screens: title, play, paused, over, win.
// ?seed=N fixes the world. ?shot=cover|cockpit|ring|landing (with &seed=N) stages that
// scene instead of running the loop, paints it twice and sets window.__shotReady.
import * as THREE from 'three';
import { SEED } from './config.js';
import { createRandom } from './random.js';
import { createWorld, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN, tickWorld, rescue } from './world.js';
import { createFlight, stepFlight } from './flight.js';
import { buildTerrain, heightAt } from './terrain.js';
import { buildAircraft, poseAircraft } from './aircraft.js';
import { buildRings, checkRings } from './rings.js';
import { buildFire, tickFire, tryDrop } from './fire.js';
import { createCameras, snapCamera, updateCamera } from './camera.js';
import { drawHUD, W, H } from './hud.js';
import { ACTION_CAMERA, ACTION_CONFIRM, ACTION_DROP, ACTION_PAUSE, createInput, readControls, takeActions } from './input.js';
import { createAudio, startAudio, updateAudio } from './audio.js';
import { createScene } from './render.js';
import { stageShot } from './shots.js';
import { chooseDecision } from './decision.js';

const STEP = 1 / 60;
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : SEED;

const canvas = document.getElementById('game');
const hudCanvas = document.getElementById('hud');
const status = document.getElementById('status');
hudCanvas.width = W;
hudCanvas.height = H;

const world = createWorld();
const flight = createFlight();
flight.y = heightAt(flight.x, flight.z) + 2.4;
const { scene, camera, rng } = createScene(seed);
buildTerrain(scene, rng);
const rings = buildRings(scene);
const fire = buildFire(scene, rng);
const plane = buildAircraft();
scene.add(plane);
const cams = createCameras();
const audio = createAudio();

// Debug handle: lets a trace script poll live flight state (position, heading,
// speed, fuel, screen) while a staged shot runs.
window.__dbg = { flight, world, cams };

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(W, H, false);
renderer.setPixelRatio(1);
const hudCtx = hudCanvas.getContext('2d');

// Falling water from a drop: a bright blob under the aircraft, gone in 2 seconds.
let dropVisual = null;
function spawnDropVisual() {
  if (dropVisual) scene.remove(dropVisual);
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(1.8, 10, 8),
    new THREE.MeshBasicMaterial({ color: 0xbfe8ff, transparent: true, opacity: 0.7 }),
  );
  mesh.scale.set(1, 2.6, 1);
  mesh.position.set(flight.x, flight.y - 8, flight.z);
  mesh.name = 'water-drop';
  scene.add(mesh);
  dropVisual = { mesh, t: 0 };
}

function renderFrame() {
  poseAircraft(plane, flight); // pose first: the cockpit camera reads the plane matrix
  // In cockpit view the canopy glass and the prop blades are hidden: the pilot
  // sits inside the canopy and sees the prop as a blur, not a dome and a bar.
  plane.userData.canopy.visible = cams.mode !== 'cockpit';
  plane.userData.blades.forEach((b) => { b.visible = cams.mode !== 'cockpit'; });
  updateCamera(cams, camera, flight, STEP, plane);
  // Fire visibly shrinks as containment rises: a contained fire is a smaller fire.
  const visible = Math.max(1, Math.round(fire.flames.length * (1 - world.fireContained / 100)));
  fire.flames.forEach((f, i) => { f.visible = i < visible; });
  fire.smokes.forEach((s, i) => { s.visible = i < Math.max(1, Math.round(fire.smokes.length * (1 - world.fireContained / 100))); });
  if (dropVisual) {
    dropVisual.t += STEP;
    dropVisual.mesh.position.y -= 90 * STEP;
    dropVisual.mesh.scale.y = Math.max(0.4, 2.4 - dropVisual.t);
    if (dropVisual.t > 2) {
      scene.remove(dropVisual.mesh);
      dropVisual = null;
    }
  }
  renderer.render(scene, camera);
  drawHUD(hudCtx, flight, world);
}

function announce(message) {
  status.textContent = message;
}

function runShot(name) {
  const ctx = { world, flight, rings, fire, cams, pressOn: false };
  const scene2 = stageShot(name, ctx);
  if (ctx.trace) window.__shotTrace = ctx.trace;
  if (ctx.dropped) spawnDropVisual();
  snapCamera(cams, camera, flight, plane);
  let painted = 0;
  function paint() {
    renderFrame();
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  world.screen = SCREEN_TITLE;
  let accumulator = 0;
  let last = performance.now();

  function startGame() {
    const fresh = createWorld();
    Object.assign(world, fresh);
    const f = createFlight();
    Object.assign(flight, f);
    flight.y = heightAt(flight.x, flight.z) + 2.4;
    plane.visible = true;
    screen = SCREEN_PLAY;
    world.screen = SCREEN_PLAY;
    startAudio(audio);
    announce('Playing. Take off down runway 36.');
  }

  function step() {
    if (screen === SCREEN_TITLE) return;
    const controls = readControls(input);
    const ev = stepFlight(flight, world, controls, STEP);
    tickWorld(world, STEP);
    checkRings(flight, world, rings);
    // Rescue completes when the dock ring (ring 9) is passed.
    if (world.ringsPassed === 9 && world.rescued === 0) {
      world.rescued = 3;
      world.score += 600;
      world.message = 'RESCUED 3/3 NELAYAN';
      world.messageSec = 2.5;
    }
    tickFire(world, STEP, fire);
    updateAudio(audio, flight);
    if (ev === 'landed' || ev === 'crashed' || ev === 'ditched') {
      screen = world.screen;
      announce(world.result ? world.result.title : 'Over.');
    }
  }

  function handleActions() {
    const { actions, decisionKey } = takeActions(input);
    if (decisionKey && world.decision && world.decision.state === 'pending') {
      chooseDecision(world, decisionKey);
    }
    if (actions & ACTION_DROP && screen === SCREEN_PLAY) {
      if (world.phase === 2) {
        const gained = tryDrop(flight, world);
        if (gained > 0) spawnDropVisual();
      }
    }
    if (actions & ACTION_CAMERA && screen === SCREEN_PLAY) {
      cams.mode = cams.mode === 'chase' ? 'cockpit' : 'chase';
    }
    if (actions & ACTION_CONFIRM && (screen === SCREEN_TITLE || screen === SCREEN_OVER || screen === SCREEN_WIN)) {
      startGame();
    } else if (actions & ACTION_PAUSE && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      world.screen = SCREEN_PAUSED;
    } else if (actions & ACTION_PAUSE && screen === SCREEN_PAUSED) {
      screen = SCREEN_PLAY;
      world.screen = SCREEN_PLAY;
    }
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleActions();
    if (screen === SCREEN_PLAY) {
      while (accumulator >= STEP && screen === SCREEN_PLAY) {
        step();
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }
    // The title screen idles the camera over the runway (a living backdrop).
    if (screen === SCREEN_TITLE) {
      flight.heading += 0.0004;
    }
    renderFrame();
  }

  announce('Nusa Ring Run. Press Space or click to take off.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
