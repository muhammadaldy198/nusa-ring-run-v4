// Arcade flight model: pitch/roll/yaw + throttle + lift + stall + ground effect.
// It has to FEEL right (K2: throttle and turn discipline) without being a simulator:
// speed follows throttle, bank turns the nose, slow + nose-up stalls, low + fast is
// the only way to land. Pure math + heightAt — deterministic for a fixed input.
import { heightAt } from './terrain.js';
import {
  CRASH_DAMAGE, FUEL_BURN_BASE, FUEL_BURN_FULL, LAND_ROLL_MAX, LAND_SINK_MAX_FPM,
  LAND_SPEED_MAX_KT, LAND_SPEED_MIN_KT, RUNWAY, STALL_KT, SPEED_MAX_KT,
} from './config.js';
import { crashPlane, ditchPlane, landPlane } from './world.js';

const KT_TO_MS = 0.514444;
const DEG = Math.PI / 180;

export function createFlight() {
  return {
    x: 0, y: 0, z: -400, // on the runway south threshold, ready to roll
    heading: 0, // heading 0 = north (-Z): takeoff rolls toward the far threshold
    pitch: 0,
    roll: 0,
    speedKt: 0,
    throttle: 0,
    flaps: false,
    gear: true,
    brake: false,
    airborne: false,
    sinkFpm: 0,
    stalled: false,
    crashed: false,
  };
}

export function headingVector(flight) {
  // Heading 0 = +Z (south), PI = -Z (north). Forward vector from heading+pitch.
  const h = flight.heading;
  return {
    x: -Math.sin(h) * Math.cos(flight.pitch),
    y: Math.sin(flight.pitch),
    z: -Math.cos(h) * Math.cos(flight.pitch),
  };
}

/**
 * One fixed 1/60 s step. `input` = { pitch: -1..1, roll: -1..1, throttleDelta,
 * flaps, gear, brake, drop }. Returns events: 'landed' | 'crashed' | 'ditched' | ''.
 */
export function stepFlight(flight, world, input, dt) {
  if (flight.crashed || world.screen === 3 || world.screen === 4) return '';
  // Throttle: Shift up, Ctrl down.
  flight.throttle = Math.max(0, Math.min(1, flight.throttle + (input.throttleDelta || 0) * dt));
  if (input.flaps !== undefined) flight.flaps = input.flaps;
  if (input.gear !== undefined) flight.gear = input.gear;
  flight.brake = !!input.brake;

  // Attitude follows the stick with a little lag (the aircraft answers, K3).
  const targetPitch = (input.pitch || 0) * 0.42;
  const targetRoll = (input.roll || 0) * 1.05;
  flight.pitch += (targetPitch - flight.pitch) * Math.min(1, dt * 4);
  flight.roll += (targetRoll - flight.roll) * Math.min(1, dt * 3.5);
  // Bank turns the nose; faster bank at higher speed.
  flight.heading += -Math.sin(flight.roll) * (0.35 + flight.speedKt / 220) * dt;

  // Speed: throttle sets the target; climb bleeds it, descent adds it; flaps/gear drag.
  let target = 58 + flight.throttle * (SPEED_MAX_KT - 58);
  if (flight.flaps) target -= 16;
  if (flight.gear && flight.airborne) target -= 6;
  if (flight.brake) target = Math.min(target, 40);
  target -= Math.sin(flight.pitch) * 55; // climbing costs speed
  flight.speedKt += (target - flight.speedKt) * Math.min(1, dt * 0.55);
  flight.speedKt = Math.max(0, flight.speedKt);

  // Stall: slow + nose-up = the nose drops and the aircraft sinks.
  flight.stalled = flight.airborne && flight.speedKt < STALL_KT;
  let pitchEff = flight.pitch;
  if (flight.stalled) pitchEff = -0.28;

  const v = headingVector({ ...flight, pitch: pitchEff });
  const ms = flight.speedKt * KT_TO_MS;
  const prevY = flight.y;
  flight.x += v.x * ms * dt;
  flight.z += v.z * ms * dt;
  flight.y += v.y * ms * dt;
  flight.sinkFpm = ((prevY - flight.y) / Math.max(dt, 1e-6)) * 196.85;

  // Takeoff: rolling fast enough on the runway lifts off.
  const ground = heightAt(flight.x, flight.z);
  if (!flight.airborne) {
    flight.y = Math.max(flight.y, ground + 2.4);
    if (flight.speedKt > 70 && pitchEff > 0.06) flight.airborne = true;
  }
  // Ground effect: a cushion in the last 10 m that forgives a hard-ish landing.
  // It must only SOFTEN the descent (undo 30% of this step's sink), never
  // reverse it: the old formula added up to +7 m/s upward at 9 m AGL, which
  // overpowered every legal sink (<600 fpm) and made landing impossible —
  // the aircraft floated at ~15 m forever and then flew off the runway end.
  const agl = flight.y - ground;
  if (flight.airborne && agl < 10 && flight.sinkFpm > 0) flight.y -= v.y * ms * dt * 0.3;

  // Fuel burn ∝ throttle; empty tank = ditch (the decision's real consequence).
  const burn = (FUEL_BURN_BASE + flight.throttle * FUEL_BURN_FULL) * dt;
  world.fuel = Math.max(0, world.fuel - burn);
  if (world.fuel <= 0 && flight.airborne && !world.ditched) {
    flight.crashed = true;
    ditchPlane(world);
    return 'ditched';
  }

  // Ground contact.
  if (flight.airborne && flight.y <= ground + 2.4) {
    const onRunway = Math.abs(flight.x - RUNWAY.x) < RUNWAY.width / 2 &&
      flight.z > RUNWAY.zMin && flight.z < RUNWAY.zMax;
    const sinkOk = flight.sinkFpm < LAND_SINK_MAX_FPM;
    const speedOk = flight.speedKt >= LAND_SPEED_MIN_KT && flight.speedKt <= LAND_SPEED_MAX_KT;
    const rollOk = Math.abs(flight.roll) < LAND_ROLL_MAX;
    if (onRunway && sinkOk && speedOk && rollOk && flight.gear) {
      flight.y = ground + 2.4;
      flight.airborne = false;
      landPlane(world, true);
      return 'landed';
    }
    flight.crashed = true;
    world.damage = CRASH_DAMAGE;
    crashPlane(world, onRunway ? 'PENDARATAN KERAS' : 'MENABRAK TANAH');
    return 'crashed';
  }
  // Water: ditching in the sea outside the island.
  if (flight.airborne && flight.y < 1 && Math.sqrt(flight.x ** 2 + flight.z ** 2) > 2400) {
    flight.crashed = true;
    ditchPlane(world);
    return 'ditched';
  }
  return '';
}

/** Distance in metres from the aircraft to a point. */
export function distTo(flight, p) {
  return Math.sqrt((flight.x - p.x) ** 2 + (flight.y - p.y) ** 2 + (flight.z - p.z) ** 2);
}
