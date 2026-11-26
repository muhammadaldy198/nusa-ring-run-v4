// The DECISION system (A1–A3): the focal system of v4. After ring 6 the tower opens
// a real choice with real fuel math and real stakes. RTB NOW lands safe and keeps
// the score; PRESS ON chases +600 and the fire/rescue/land phases on fuel that does
// not quite cover them — press on and the tank can run dry over the sea. The panel,
// the gauge and the radio all print the same numbers (config.js is the single source).
import { DECISION, FUEL_PRESS_ON_NEED, FUEL_RTB_NEED } from './config.js';

/** The numbers the HUD panel prints — computed, never typed twice. */
export function decisionNumbers(world) {
  const aboard = world.decision ? world.decision.aboard : Math.round(world.fuel);
  return {
    aboard,
    rtbNeed: FUEL_RTB_NEED,
    pressNeed: FUEL_PRESS_ON_NEED,
    rtbMargin: aboard - FUEL_RTB_NEED,
    pressShort: FUEL_PRESS_ON_NEED - aboard,
  };
}

/**
 * Apply the pilot's choice. Returns 'rtb' | 'press' | null.
 * RTB: the next ring becomes the final approach gate — fly home and land.
 * PRESS ON: the course continues to rings 7-10; the fuel math is now the pilot's.
 */
export function chooseDecision(world, key) {
  if (!world.decision || world.decision.state !== 'pending') return null;
  if (key === '1') {
    world.decision.state = 'rtb';
    world.decisionMade = true;
    // RTB: skip phases 2-3, fly straight to the final approach gate (ring 10).
    world.nextRing = 9;
    world.phase = 3;
    world.message = 'RTB NOW — PULANG, SKOR AMAN';
    world.messageSec = 3;
    return 'rtb';
  }
  if (key === '2') {
    world.decision.state = 'press';
    world.decisionMade = true;
    world.message = 'PRESS ON — +600 PTS, RISIKO DITCH';
    world.messageSec = 3;
    return 'press';
  }
  return null;
}

/** Radio strip lines, rotating slowly while flying. */
export function radioLine(world, lines) {
  if (world.decision && world.decision.state === 'pending') return lines[0];
  if (world.phase === 2) return lines[1];
  if (world.stormSec < 20) return lines[2];
  return lines[world.radio % lines.length];
}

export { DECISION };
