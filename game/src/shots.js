// Staging: the screenshot scenes behind ?shot=cover|cockpit|ring|landing. Each one
// plays the REAL rules forward from takeoff with a waypoint autopilot (steer to the
// next ring, throttle discipline, flaps/gear for landing), so the frame is what a
// short game really looks like and the same seed always gives the same frame.
// No pose is hand-placed except the final framing nudge — the aircraft really flew
// there. Deterministic: fixed seed, fixed step counts, no wall-clock anywhere.
import { RINGS, RUNWAY } from './config.js';
import { createFlight, stepFlight, distTo } from './flight.js';
import { checkRings } from './rings.js';
import { tickFire, tryDrop } from './fire.js';
import { chooseDecision } from './decision.js';
import { tickWorld, SCREEN_PLAY, SCREEN_WIN } from './world.js';
import { heightAt } from './terrain.js';

const STEP = 1 / 60;
const MAX_STEPS_PER_LEG = 60 * 45; // 45 sim-seconds per leg, then give up the leg

/** Steer the aircraft toward a point: PD on bearing + elevation, throttle by need. */
function autopilotInput(flight, target, throttle) {
  const dx = target.x - flight.x;
  const dy = target.y - flight.y;
  const dz = target.z - flight.z;
  const absBearing = Math.atan2(-dx, -dz);
  let rel = absBearing - flight.heading;
  while (rel > Math.PI) rel -= Math.PI * 2;
  while (rel < -Math.PI) rel += Math.PI * 2;
  const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
  const elev = Math.atan2(dy, Math.sqrt(dx * dx + dz * dz));
  // Roll sign: rel > 0 means the target is LEFT of the nose (west of north);
  // turning left needs a LEFT bank (negative roll) — heading grows with left bank.
  let pitchCmd = (elev - flight.pitch) * 3.0;
  // Climb-out floor: keep the aircraft above the hills on the way UP to a high
  // target. It must NOT apply when the leg intentionally descends (a low target:
  // fire runs, the landing level-off) — the floor pinned the final approach at
  // 150 m until 300 m out, then released into a suicidal dive.
  if (flight.y < 150 && dist > 300 && target.y >= 150) pitchCmd = Math.max(pitchCmd, 0.55);
  return {
    pitch: Math.max(-1, Math.min(1, pitchCmd)),
    roll: Math.max(-1, Math.min(1, -rel * 1.6)),
    throttleDelta: throttle > flight.throttle ? 0.6 : throttle < flight.throttle ? -0.6 : 0,
    flaps: false,
    gear: false,
    brake: false,
  };
}

function flyLeg(ctx, target, throttle, extra, ringIndex) {
  const { flight, world } = ctx;
  let steps = 0;
  while (steps < MAX_STEPS_PER_LEG) {
    steps += 1;
    const input = autopilotInput(flight, target, throttle);
    if (extra) extra(input, ctx);
    stepFlight(flight, world, input, STEP);
    tickWorld(world, STEP);
    checkRings(flight, world, ctx.rings);
    if (ctx.fire) tickFire(world, STEP, ctx.fire);
    if (world.screen === 3 || world.screen === 4) break;
    // A ring leg ends the moment the ring is passed (not at 60 m short of it —
    // the pass radius is 29 m, so a distance break would stop before the pass).
    if (ringIndex !== undefined && world.nextRing > ringIndex) break;
    if (ringIndex === undefined && distTo(flight, target) < 60) break;
  }
  return steps;
}

/** Fly the course up to (and through) ring `upto` (0-based, exclusive of `upto`). */
function flyCourse(ctx, upto) {
  const { flight, world } = ctx;
  // Takeoff roll: full throttle down the runway, rotate hard at speed.
  let steps = 0;
  while (!flight.airborne && steps < 60 * 20) {
    steps += 1;
    stepFlight(flight, world, { pitch: 0.8, roll: 0, throttleDelta: 0.6, flaps: false, gear: true, brake: false }, STEP);
    tickWorld(world, STEP);
  }
  // Climb-out: straight north to 170 m before the first ring — the terrain north of
  // the runway rises, and a shallow climb would fly straight into the hill.
  flyLeg(ctx, { x: 0, y: 175, z: -1500 }, 0.75);
  for (let i = 0; i < upto; i += 1) {
    if (world.nextRing > i) continue; // already passed (shouldn't happen)
    // The fire run happens on the way to ring 8: low passes over the ridge fire.
    if (i === 7 && ctx.pressOn) {
      fireRun(ctx);
      if (ctx.fireRunTwice) {
        flyLeg(ctx, { x: 1150, y: 140, z: 100 }, 0.6, (input) => { input.flaps = true; });
        fireRun(ctx);
      }
    }
    flyLeg(ctx, RINGS[i], 0.72, undefined, i);
    checkRings(flight, world, ctx.rings);
    // The decision opens at ring 6: the staged cover answers nothing (panel up).
    // For ring/fire/landing shots the pilot presses on.
    if (world.decision && world.decision.state === 'pending' && ctx.pressOn) {
      chooseDecision(world, '2');
    }
  }
}

/** One low pass over the fire centre and a drop (under 250 ft AGL = 50% held). */
function fireRun(ctx) {
  const { flight, world } = ctx;
  flyLeg(ctx, { x: 1150, y: 140, z: -500 }, 0.55, (input) => { input.flaps = true; });
  const gained = tryDrop(flight, world);
  if (gained > 0) ctx.dropped = true;
}

/** Fly toward a point for exactly N fixed steps (a coast, not a leg). */
function flySteps(ctx, target, throttle, steps) {
  const { flight, world } = ctx;
  for (let i = 0; i < steps; i += 1) {
    const input = autopilotInput(flight, target, throttle);
    stepFlight(flight, world, input, STEP);
    tickWorld(world, STEP);
    checkRings(flight, world, ctx.rings);
    if (ctx.fire) tickFire(world, STEP, ctx.fire);
    if (world.screen === 3 || world.screen === 4) break;
  }
}

/**
 * Set `world`/`flight` to the named scene and return the camera mode + screen to draw.
 * ctx: { world, flight, rings, fire, cams }.
 */
export function stageShot(name, ctx) {
  const { world, flight, cams } = ctx;
  world.screen = SCREEN_PLAY;
  flight.throttle = 0;
  flight.y = heightAt(flight.x, flight.z) + 2.4;

  if (name === 'cockpit') {
    flyCourse(ctx, 4); // through ring 4, TELUK NELAYAN
    // Head for ring 5 (DANAU NUSA): the lake fills the frame ahead-below the nose.
    flyLeg(ctx, { x: 300, y: 175, z: 700 }, 0.7);
    world.stormSec = 41;
    world.stormNm = 2.4;
    world.firelineSec = 26;
    world.firelineNm = 1.0;
    cams.mode = 'cockpit';
    return { screen: SCREEN_PLAY };
  }
  if (name === 'ring') {
    ctx.pressOn = true;
    flyCourse(ctx, 8); // through ring 8, GERBANG DAMAR (fire gate); fire run dropped once
    // Back over the fire zone for the frame: the drop visual falls under the aircraft.
    flyLeg(ctx, { x: 1150, y: 170, z: -500 }, 0.55, (input) => { input.flaps = true; });
    for (let i = 0; i < 40; i += 1) {
      stepFlight(flight, world, { pitch: 0, roll: 0, throttleDelta: 0.3, flaps: true, gear: false, brake: false }, STEP);
      tickWorld(world, STEP);
      if (ctx.fire) tickFire(world, STEP, ctx.fire);
    }
    world.stormSec = 31;
    world.stormNm = 1.9;
    world.firelineSec = 18;
    world.firelineNm = 0.7;
    cams.mode = 'chase';
    return { screen: SCREEN_PLAY };
  }
  if (name === 'landing') {
    ctx.pressOn = true;
    ctx.fireRunTwice = true; // two low passes = fire 100% held before the landing
    flyCourse(ctx, 10); // all ten rings
    // A third pass if the fire is not fully held yet (the tank holds 3 drops).
    if (world.fireContained < 100 && world.dropsLeft > 0) {
      flyLeg(ctx, { x: 1150, y: 140, z: 100 }, 0.6, (input) => { input.flaps = true; });
      fireRun(ctx);
    }
    // Rescue completes at the dock ring (ring 9): the crew is aboard.
    if (world.rescued === 0) {
      world.rescued = 3;
      world.score += 600;
    }
    // Staging pin: the approach needs fuel to demonstrate a landing. The live
    // game is a genuine gamble (press on with 124 kg vs 165 kg needed); the
    // staged approach just needs enough to reach the runway.
    world.fuel = Math.max(world.fuel, 90);
    // Final approach (northbound, runway 36): the last ring sits south of the
    // field, so the aircraft continues south over the low coast, turns around
    // at 75 m, then flies LEVEL up the cleared valley to the threshold and
    // descends the runway itself (a fixed -0.21 input, -0.088 rad, sinks
    // 2.9 m/s — under the 600 fpm hard-landing limit). Touchdown ~800 m past
    // the threshold, on the 900 m strip. (Both earlier attempts failed on
    // terrain: the hills north of the field rise into a glide from the north,
    // and a fixed descent from the south flew into the hill south of the
    // field — the approach has to stay level until it is over the tarmac.)
    flyLeg(ctx, { x: 0, y: 75, z: 700 }, 0.5, (input) => { input.flaps = true; input.gear = true; });
    flyLeg(ctx, { x: 0, y: 75, z: -400 }, 0.3, (input) => { input.flaps = true; input.gear = true; });
    let steps = 0;
    const trace = [];
    while (world.screen === SCREEN_PLAY && steps < 60 * 75) {
      steps += 1;
      // Roll steers to the runway centre; pitch is a fixed descent (see above).
      // The steering target sits at the far end of the strip so the aircraft
      // keeps flying straight north while it descends — a target mid-runway
      // flips the bearing overhead and the autopilot turns it off the strip.
      const input = autopilotInput(flight, { x: 0, y: 6, z: -1250 }, 0.2);
      input.pitch = -0.21;
      input.flaps = true;
      input.gear = true;
      stepFlight(flight, world, input, STEP);
      tickWorld(world, STEP);
      if (ctx.fire) tickFire(world, STEP, ctx.fire);
      if (steps % 30 === 0) {
        trace.push({
          t: (steps / 60).toFixed(1),
          x: Math.round(flight.x), y: Math.round(flight.y), z: Math.round(flight.z),
          hdg: Math.round(((flight.heading * 180) / Math.PI + 360) % 360),
          spd: Math.round(flight.speedKt), fuel: Math.round(world.fuel),
        });
      }
    }
    ctx.trace = trace;
    world.stormSec = 12;
    world.stormNm = 0.8;
    world.firelineSec = 8;
    world.firelineNm = 0.3;
    cams.mode = 'chase';
    return { screen: world.screen === SCREEN_WIN ? SCREEN_WIN : SCREEN_PLAY };
  }
  // Default: cover — through ring 6, decision panel up, storm + fireline counting.
  flyCourse(ctx, 6);
  // Coast 4 s past ring 6 toward ring 7: the passed ring falls behind the camera
  // (it filled the whole frame at the pass) and ring 7 comes into view ahead.
  flySteps(ctx, RINGS[6], 0.72, 240);
  // Pin the decision numbers to the staged state (the live burn lands within a few
  // kg of this; the panel, gauge and radio all print the same pinned numbers).
  if (world.decision) {
    world.decision.aboard = 124;
    world.decision.timer = 30;
  }
  world.fuel = 124;
  world.stormSec = 47;
  world.stormNm = 2.8;
  world.firelineSec = 30;
  world.firelineNm = 1.2;
  // Frame the shot: chase camera behind, ring 7 + runway ahead, volcano + lake in view.
  cams.mode = 'chase';
  return { screen: SCREEN_PLAY };
}

export { createFlight };
