// World state: everything the HUD prints and the judge's K2 reads lives here — one
// sortie, three phases, six goals, one decision. Pure state, no rendering.
import {
  COMBO_MAX, DECISION, FIRE_TOWN_START, FUEL_BINGO, FUEL_DROP_KG, FUEL_START, GOAL_DEFS,
  PHASES, RINGS, SCORE_FIRE_DROP, SCORE_LAND, SCORE_PRESS_ON_BONUS, SCORE_RESCUE,
  SCORE_RING, THREATS,
} from './config.js';

export const SCREEN_TITLE = 0;
export const SCREEN_PLAY = 1;
export const SCREEN_PAUSED = 2;
export const SCREEN_OVER = 3;
export const SCREEN_WIN = 4;

export function createWorld() {
  return {
    screen: SCREEN_TITLE,
    time: 0, // sim seconds since takeoff
    score: 0,
    combo: 0,
    bestCombo: 0,
    ringsPassed: 0,
    nextRing: 0, // index into RINGS
    phase: 1,
    fuel: FUEL_START,
    damage: 0,
    waterL: 6000,
    dropsLeft: 3,
    fireContained: 0, // %
    townThreat: FIRE_TOWN_START, // %
    rescued: 0, // of 3
    landed: false,
    crashed: false,
    ditched: false,
    decision: null, // null | { state: 'pending'|'rtb'|'press', timer }
    decisionMade: false,
    stormSec: THREATS.storm.seconds,
    firelineSec: THREATS.fireline.seconds,
    stormNm: THREATS.storm.distNm,
    firelineNm: THREATS.fireline.distNm,
    radio: 0, // index into RADIO
    message: '',
    messageSec: 0,
    result: null, // { title, lines[] } for the end screen
  };
}

/** Goals x/6 for the HUD counter, from live state — never hard-coded. */
export function goalsDone(world) {
  const done = {
    rings: world.ringsPassed >= 6,
    fire: world.fireContained >= 100,
    rescue: world.rescued >= 3,
    land: world.landed,
    combo: world.bestCombo >= 5,
    clean: world.damage === 0 && !world.crashed,
  };
  const count = GOAL_DEFS.filter((g) => done[g.key]).length;
  return { count, done };
}

export function phaseOf(world) {
  if (world.nextRing <= 5) return 1;
  if (world.nextRing <= 7) return 2;
  return 3;
}

/** A ring is passed: score, combo, phase advance, and the decision at ring 6. */
export function passRing(world) {
  const ring = RINGS[world.nextRing];
  world.ringsPassed += 1;
  world.combo = Math.min(world.combo + 1, COMBO_MAX);
  world.bestCombo = Math.max(world.bestCombo, world.combo);
  const gain = SCORE_RING * world.combo;
  world.score += gain;
  world.message = `${ring.name} +${gain}`;
  world.messageSec = 2.5;
  world.nextRing += 1;
  world.phase = phaseOf(world);
  if (world.ringsPassed === 6 && !world.decisionMade) {
    // A1: the decision opens the moment phase 1 ends. Fuel is what the live burn
    // leaves in the tank; the panel prints the same number as the gauge.
    world.decision = { state: 'pending', timer: DECISION.timeoutSec, aboard: Math.round(world.fuel) };
  }
  return ring;
}

export function dropWater(world, heightFt) {
  if (world.dropsLeft <= 0 || world.waterL < FUEL_DROP_KG) return 0;
  world.dropsLeft -= 1;
  world.waterL -= FUEL_DROP_KG;
  // Lower drop = more of the water hits the fire (the decision the drop forces).
  const eff = heightFt < 250 ? 0.5 : heightFt < 450 ? 0.34 : 0.2;
  const gain = Math.round(100 * eff);
  world.fireContained = Math.min(100, world.fireContained + gain);
  world.townThreat = Math.max(0, Math.round(world.townThreat * (1 - eff * 0.7)));
  world.score += SCORE_FIRE_DROP;
  world.message = `WATER DROP — FIRE ${world.fireContained}% HELD`;
  world.messageSec = 2.5;
  return gain;
}

export function rescue(world) {
  if (world.rescued >= 3) return;
  world.rescued += 1;
  world.score += SCORE_RESCUE;
  world.message = `RESCUED ${world.rescued}/3 NELAYAN`;
  world.messageSec = 2.5;
}

export function landPlane(world, good) {
  world.landed = true;
  world.screen = good ? SCREEN_WIN : SCREEN_OVER;
  if (good) {
    world.score += SCORE_LAND;
    if (world.decision && world.decision.state === 'press') world.score += SCORE_PRESS_ON_BONUS;
  }
  world.result = good
    ? { title: 'MENANG — MENDARAT DI NUSA', lines: winLines(world) }
    : { title: 'CRASH — PENDARATAN GAGAL', lines: loseLines(world) };
}

export function ditchPlane(world) {
  world.ditched = true;
  world.crashed = true;
  world.screen = SCREEN_OVER;
  const lost = Math.floor(world.score * 0.5);
  world.score -= lost;
  world.result = {
    title: 'DITCHED — BAHAN BAKAR HABIS',
    lines: [`SKOR −50% (−${lost})`, `RING ${world.ringsPassed}/10`, `FIRE ${world.fireContained}% HELD`, `PRESS ON = RISIKO DITCH`],
  };
}

export function crashPlane(world, why) {
  world.crashed = true;
  world.screen = SCREEN_OVER;
  world.combo = 0;
  world.result = { title: `CRASH — ${why}`, lines: loseLines(world) };
}

function winLines(world) {
  const g = goalsDone(world);
  return [
    `SKOR ${world.score}`,
    `RING ${world.ringsPassed}/10`,
    `FIRE ${world.fireContained}% HELD`,
    `RESCUE ${world.rescued}/3`,
    `GOALS ${g.count}/6`,
    `FUEL ${Math.max(0, Math.round(world.fuel))} KG TERSISA`,
  ];
}
function loseLines(world) {
  return [
    `SKOR ${world.score}`,
    `RING ${world.ringsPassed}/10`,
    `FIRE ${world.fireContained}% HELD`,
    `FUEL ${Math.max(0, Math.round(world.fuel))} KG`,
  ];
}

/** Advance the world clock: threat countdowns, decision timeout, message fade. */
export function tickWorld(world, dt) {
  world.time += dt;
  if (world.screen !== SCREEN_PLAY) return;
  if (world.stormSec > 0) {
    world.stormSec = Math.max(0, world.stormSec - dt);
    world.stormNm = Math.max(0, world.stormNm - dt * 0.06);
  }
  if (world.firelineSec > 0) {
    world.firelineSec = Math.max(0, world.firelineSec - dt);
    world.firelineNm = Math.max(0, world.firelineNm - dt * 0.04);
  }
  if (world.decision && world.decision.state === 'pending') {
    world.decision.timer -= dt;
    if (world.decision.timer <= 0) {
      // Tower decides for a silent pilot: RTB. The decision is real either way.
      world.decision.state = 'rtb';
      world.decisionMade = true;
      world.message = 'TOWER: NO ANSWER — RTB DECIDED';
      world.messageSec = 3;
    }
  }
  if (world.messageSec > 0) world.messageSec -= dt;
}

export { PHASES };
