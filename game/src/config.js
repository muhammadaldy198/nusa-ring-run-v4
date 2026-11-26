// NUSA RING RUN v4 — config: one source of truth for the world, the course and the
// decision math. Every number the HUD prints comes from here, so the fuel gauge, the
// DECISION panel and the radio strip can never disagree with each other.
export const SEED = 20261127;
export const WORLD_SIZE = 5200; // terrain spans -2600..2600 on x and z
export const SEA_LEVEL = 0;
export const LAKE_LEVEL = 8;

// Fuel (kg). A real player reaches ring 6 with ~120-130 kg aboard; the staged cover
// state is the same state a live run reaches (fuel 124 kg), not a made-up number.
export const FUEL_START = 320;
export const FUEL_BURN_BASE = 0.35; // kg/s at idle
export const FUEL_BURN_FULL = 1.9; // kg/s at full throttle
export const FUEL_RTB_NEED = 118; // kg needed to fly home from ring 6 and land
export const FUEL_PRESS_ON_NEED = 165; // kg needed for rings 7-10 + fire + rescue + land
export const FUEL_BINGO = 118; // bingo line on the gauge
export const FUEL_DROP_KG = 2000; // litres per water drop (tank 6000 L)

// Flight limits (arcade, but felt): stall, landing window, damage.
export const STALL_KT = 55;
export const SPEED_MAX_KT = 175;
export const LAND_SPEED_MIN_KT = 55;
export const LAND_SPEED_MAX_KT = 95;
export const LAND_SINK_MAX_FPM = 600;
export const LAND_ROLL_MAX = 0.2; // rad
export const CRASH_DAMAGE = 100;

// The 10-ring course: one loop around the island, takeoff north, land north.
// Ring = torus the aircraft flies through. Names are Indonesian, never copied.
export const RINGS = [
  { name: 'GERBANG MERAPI', x: -250, y: 150, z: -1350, r: 34 },
  { name: 'LEMBAH SAWAH', x: -800, y: 170, z: -900, r: 34 },
  { name: 'TANJUNG MERCUSUAR', x: -1300, y: 180, z: -200, r: 34 },
  { name: 'TELUK NELAYAN', x: -800, y: 160, z: 600, r: 34 },
  { name: 'DANAU NUSA', x: 300, y: 170, z: 1000, r: 34 },
  { name: 'PASAR APUNG', x: 1100, y: 160, z: 500, r: 34 },
  { name: 'LERENG API', x: 1000, y: 200, z: -400, r: 34 },
  { name: 'GERBANG DAMAR', x: 500, y: 170, z: -900, r: 34 },
  { name: 'DERMAGA NUSA', x: 250, y: 140, z: -50, r: 34 },
  { name: 'PENDEKATAN AKHIR', x: 0, y: 130, z: 300, r: 36 },
];

// Phases of one sortie (K2: missions with different goals, not ten identical rings).
export const PHASES = [
  { id: 1, name: 'RING RUN', rings: [0, 1, 2, 3, 4, 5], goal: 'Terbang 6 ring bernama' },
  { id: 2, name: 'FIRE DROP', rings: [6, 7], goal: 'Padamkan api lereng — drop rendah, drop pasti' },
  { id: 3, name: 'RESCUE + LAND', rings: [8, 9], goal: 'Angkut 3 nelayan, mendarat di Nusa' },
];

// The six goals on the HUD counter (GOALS x/6).
export const GOAL_DEFS = [
  { key: 'rings', label: 'RING RUN 6/6' },
  { key: 'fire', label: 'FIRE 100% HELD' },
  { key: 'rescue', label: 'RESCUE 3/3' },
  { key: 'land', label: 'LAND ON NUSA' },
  { key: 'combo', label: 'KOMBO x5' },
  { key: 'clean', label: 'CLEAN — NO DMG' },
];

// Runway "Lapangan Terbang Nusa": north-south strip, threshold south z=-400.
export const RUNWAY = { x: 0, zMin: -1300, zMax: -400, width: 44, heading: '36' };

// Fire zone on the east ridge (FIRE OPS).
export const FIRE_ZONE = { x: 1150, z: -500, radius: 260 };
export const FIRE_TOWN_START = 83; // % of town threatened when the fire starts

// Landmarks (recognisable terrain, K1/K4).
export const VOLCANO = { x: -900, z: -1400, height: 420, radius: 520 };
export const LAKE = { x: 500, z: 1100, radius: 350 };
export const LIGHTHOUSE = { x: -1450, z: -150 };
export const VILLAGE = { x: -950, z: 700 };
export const MARKET = { x: 1100, z: 500 };

// The decision (A1): two named options, real fuel math, real stakes.
export const DECISION = {
  title: 'BINGO FUEL — KEPUTUSAN',
  aboard: 124, // kg aboard at the decision (ring 6, live run)
  rtbNeed: FUEL_RTB_NEED,
  pressNeed: FUEL_PRESS_ON_NEED,
  option1: { key: '1', name: 'RTB NOW', text: 'Pulang sekarang — mendarat aman, skor aman' },
  option2: { key: '2', name: 'PRESS ON', text: 'Lanjut 4 ring + api + rescue — +600 pts, risiko ditch' },
  rtbStake: 'RTB = SKOR AMAN',
  pressStake: 'DITCH = LOSE 50% SCORE',
  timeoutSec: 30, // tower decides RTB if the pilot says nothing
};

// Threat timers (countdowns, never count-ups — A2).
export const THREATS = {
  storm: { label: 'STORM WALL', distNm: 2.8, seconds: 47 },
  fireline: { label: 'FIRE LINE', distNm: 1.2, seconds: 30 },
};

// Radio lines (A3) — the tower narrates the decision.
export const RADIO = [
  'NUSA TOWER: FUEL CRITICAL — RTB OR PRESS ON, YOUR CALL',
  'FIRE OPS: TOWN 83% — DROP LOW, DROP SURE',
  'TOWER: STORM WALL 2.8 NM BEHIND — CLOCK IS RUNNING',
];

export const SCORE_RING = 100;
export const SCORE_FIRE_DROP = 250;
export const SCORE_RESCUE = 200;
export const SCORE_LAND = 500;
export const SCORE_PRESS_ON_BONUS = 600;
export const COMBO_MAX = 9;
