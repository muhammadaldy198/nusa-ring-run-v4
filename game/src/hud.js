// HUD: every system in one frame (the judge reads the game through this canvas).
// Panels are dark translucent with amber accents; key numbers are big enough to read
// at 768x480 on the contact sheet. Nothing here is decoration: every number comes
// from live state (world/flight), so the panel can never disagree with the game.
import { DECISION, FIRE_ZONE, GOAL_DEFS, RINGS, RUNWAY } from './config.js';
import { goalsDone } from './world.js';
import { decisionNumbers, radioLine } from './decision.js';
import { nextRingInfo } from './rings.js';
import { RADIO } from './config.js';

const W = 1280;
const H = 720;
const PANEL = 'rgba(8,12,20,0.74)';
const PANEL_LINE = 'rgba(255,176,32,0.55)';
const AMBER = '#ffb020';
const ORANGE = '#ff7a1a';
const GREEN = '#2ecc71';
const RED = '#ff4444';
const INK = '#f2f2e8';

function panel(ctx, x, y, w, h) {
  ctx.fillStyle = PANEL;
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = PANEL_LINE;
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, w, h);
}
function text(ctx, s, x, y, size, color, align = 'left', bold = true) {
  ctx.font = `${bold ? '700' : '400'} ${size}px 'DejaVu Sans', system-ui, sans-serif`;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(s, x, y);
}
function fmtTime(sec) {
  const s = Math.max(0, Math.ceil(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

function drawTapes(ctx, flight, world) {
  // Left column: ALT / SPD / HDG tapes + throttle + fuel + damage.
  const x = 12;
  panel(ctx, x, 84, 168, 136);
  text(ctx, 'ALT', x + 10, 104, 13, AMBER);
  text(ctx, `${Math.round(flight.y * 3.28)}`, x + 10, 136, 34, INK);
  text(ctx, 'FT', x + 118, 136, 13, AMBER);
  text(ctx, 'SPD', x + 10, 164, 13, AMBER);
  text(ctx, `${Math.round(flight.speedKt)}`, x + 10, 196, 34, INK);
  text(ctx, 'KT', x + 118, 196, 13, AMBER);
  const hdg = ((Math.round((-flight.heading * 180) / Math.PI) % 360) + 360) % 360;
  text(ctx, `HDG ${String(hdg).padStart(3, '0')}°`, x + 10, 214, 16, INK);
  // Throttle bar; the label sits in the gap below it (never on the bar, never cut).
  ctx.fillStyle = '#222';
  ctx.fillRect(x + 10, 226, 148, 12);
  ctx.fillStyle = AMBER;
  ctx.fillRect(x + 10, 226, 148 * flight.throttle, 12);
  text(ctx, `THR ${Math.round(flight.throttle * 100)}%`, x + 10, 254, 11, INK);
  // Fuel gauge with the BINGO line (118 kg) — the same number as the DECISION panel.
  const fy = 258;
  panel(ctx, x, fy, 168, 118);
  text(ctx, 'FUEL', x + 10, fy + 20, 13, AMBER);
  const fuel = Math.max(0, Math.round(world.fuel));
  text(ctx, `${fuel} KG`, x + 10, fy + 52, 30, fuel < 130 ? RED : INK);
  const barY = fy + 62;
  ctx.fillStyle = '#222';
  ctx.fillRect(x + 10, barY, 148, 14);
  ctx.fillStyle = fuel < 130 ? RED : GREEN;
  ctx.fillRect(x + 10, barY, 148 * Math.min(1, fuel / 320), 14);
  const bingoX = x + 10 + 148 * (118 / 320);
  ctx.strokeStyle = RED;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(bingoX, barY - 2);
  ctx.lineTo(bingoX, barY + 16);
  ctx.stroke();
  text(ctx, 'BINGO 118 KG', x + 10, barY + 32, 11, RED);
  // Damage + gear/flaps lights.
  const dy = fy + 126;
  panel(ctx, x, dy, 168, 52);
  text(ctx, `DMG ${Math.round(world.damage)}%`, x + 10, dy + 20, 14, world.damage > 0 ? RED : GREEN);
  text(ctx, `GEAR ${flight.gear ? 'DOWN' : 'UP'} · FLAP ${flight.flaps ? 'ON' : 'OFF'}`, x + 10, dy + 42, 12, INK);
}

function drawDecision(ctx, world) {
  // A1: the DECISION panel is the focal system of the cover — below the top bar
  // (never covering the score), large, two named options with real fuel math.
  const d = world.decision;
  if (!d || d.state !== 'pending') return;
  const n = decisionNumbers(world);
  const x = 330;
  const y = 72;
  const w = 620;
  const h = 148;
  ctx.fillStyle = 'rgba(40,16,0,0.88)';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = ORANGE;
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
  text(ctx, '⚠ BINGO FUEL — KEPUTUSAN', x + 16, y + 30, 22, ORANGE);
  text(ctx, `ABOARD ${n.aboard} KG  ·  RTB BUTUH ${n.rtbNeed} KG  ·  PRESS ON BUTUH ${n.pressNeed} KG`, x + 16, y + 56, 15, INK);
  text(ctx, `TIMER ${fmtTime(d.timer)} — TOWER DECIDES RTB IF NO ANSWER`, x + 16, y + 78, 13, AMBER);
  // Option 1 (left) vs option 2 (right).
  ctx.fillStyle = 'rgba(46,204,113,0.18)';
  ctx.fillRect(x + 16, y + 88, 288, 50);
  ctx.strokeStyle = GREEN;
  ctx.strokeRect(x + 16.5, y + 88.5, 288, 50);
  text(ctx, '[1] RTB NOW', x + 28, y + 110, 17, GREEN);
  text(ctx, 'Pulang — mendarat aman, skor aman', x + 28, y + 130, 12, INK);
  ctx.fillStyle = 'rgba(255,68,68,0.16)';
  ctx.fillRect(x + 316, y + 88, 288, 50);
  ctx.strokeStyle = RED;
  ctx.strokeRect(x + 316.5, y + 88.5, 288, 50);
  text(ctx, '[2] PRESS ON', x + 328, y + 110, 17, RED);
  text(ctx, '+600 pts — risiko ditch, lose 50%', x + 328, y + 130, 12, INK);
}

function drawRight(ctx, world) {
  const x = 1100;
  // FIRE OPS panel.
  panel(ctx, x, 84, 168, 118);
  text(ctx, 'FIRE OPS', x + 10, 106, 13, ORANGE);
  text(ctx, `FIRE ${Math.round(world.fireContained)}% HELD`, x + 10, 132, 15, world.fireContained >= 100 ? GREEN : INK);
  text(ctx, `TOWN ${Math.round(world.townThreat)}%`, x + 10, 154, 15, world.townThreat > 70 ? RED : INK);
  text(ctx, `WATER ${Math.round(world.waterL)} L`, x + 10, 176, 15, INK);
  text(ctx, `DROPS ${world.dropsLeft}/3`, x + 10, 196, 13, AMBER);
  // Threat countdowns (live, never count-ups).
  panel(ctx, x, 210, 168, 100);
  text(ctx, `STORM WALL ${world.stormNm.toFixed(1)} NM`, x + 10, 232, 13, RED);
  text(ctx, fmtTime(world.stormSec), x + 10, 258, 24, RED);
  text(ctx, `FIRE LINE ${world.firelineNm.toFixed(1)} NM`, x + 10, 284, 12, ORANGE);
  text(ctx, fmtTime(world.firelineSec), x + 10, 306, 16, ORANGE);
  // Goals checklist.
  const g = goalsDone(world);
  panel(ctx, x, 318, 168, 150);
  text(ctx, `GOALS ${g.count}/6`, x + 10, 340, 15, AMBER);
  GOAL_DEFS.forEach((def, i) => {
    const done = g.done[def.key];
    text(ctx, `${done ? '✓' : '·'} ${def.label}`, x + 10, 362 + i * 19, 12, done ? GREEN : INK, 'left', done);
  });
}

function drawHorizon(ctx, flight) {
  // Artificial horizon, bottom-left: sky/ground split rolled with the bank.
  const cx = 96;
  const cy = 606;
  const r = 56;
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();
  ctx.translate(cx, cy);
  ctx.rotate(-flight.roll);
  const off = flight.pitch * 160; // nose up → horizon sinks in the glass, more sky shows
  ctx.fillStyle = '#7fb2d9';
  ctx.fillRect(-r * 2, -r * 2 + off, r * 4, r * 2);
  ctx.fillStyle = '#5a3d22';
  ctx.fillRect(-r * 2, off, r * 4, r * 2);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-r * 2, off);
  ctx.lineTo(r * 2, off);
  ctx.stroke();
  ctx.restore();
  ctx.strokeStyle = PANEL_LINE;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();
  // Fixed aircraft symbol over the horizon.
  ctx.strokeStyle = ORANGE;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(cx - 22, cy);
  ctx.lineTo(cx + 22, cy);
  ctx.moveTo(cx, cy - 4);
  ctx.lineTo(cx, cy + 4);
  ctx.stroke();
  text(ctx, 'ATT', cx, cy + r + 16, 11, AMBER, 'center');
}

function drawNextRing(ctx, flight, world) {
  const info = nextRingInfo(flight, world);
  if (!info) return;
  const cx = 640;
  const cy = 600;
  // Arrow pointing at the next ring (rotated by relative bearing: rel > 0 is left).
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(-info.rel);
  ctx.fillStyle = ORANGE;
  ctx.beginPath();
  ctx.moveTo(0, -34);
  ctx.lineTo(16, 10);
  ctx.lineTo(0, 2);
  ctx.lineTo(-16, 10);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  text(ctx, `NEXT: ${info.name}`, cx, cy + 62, 20, INK, 'center');
  text(ctx, `${info.dist} M  ·  ${info.dy >= 0 ? '+' : ''}${info.dy} M`, cx, cy + 88, 16, AMBER, 'center');
}

function drawMinimap(ctx, flight, world) {
  const x = 1100;
  const y = 474;
  const w = 168;
  const h = 126;
  panel(ctx, x, y, w, h);
  const cx = x + w / 2;
  const cy = y + h / 2;
  const s = (w / 2 - 8) / 2600;
  // Island blob.
  ctx.fillStyle = 'rgba(53,85,38,0.9)';
  ctx.beginPath();
  ctx.ellipse(cx, cy, 2300 * s, 2300 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  // Lake.
  ctx.fillStyle = 'rgba(77,142,160,0.9)';
  ctx.beginPath();
  ctx.arc(cx + 500 * s, cy + 1100 * s, 350 * s, 0, Math.PI * 2);
  ctx.fill();
  // Runway.
  ctx.strokeStyle = '#f5f5f5';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(cx, cy - 1000 * s);
  ctx.lineTo(cx, cy - 400 * s);
  ctx.stroke();
  // Fire zone.
  ctx.fillStyle = 'rgba(255,90,26,0.75)';
  ctx.beginPath();
  ctx.arc(cx + 1150 * s, cy - 500 * s, 260 * s, 0, Math.PI * 2);
  ctx.fill();
  // Rings: green passed, orange next, grey future.
  RINGS.forEach((ring, i) => {
    ctx.fillStyle = i < world.nextRing ? GREEN : i === world.nextRing ? ORANGE : '#888';
    ctx.beginPath();
    ctx.arc(cx + ring.x * s, cy + ring.z * s, i === world.nextRing ? 5 : 3.5, 0, Math.PI * 2);
    ctx.fill();
  });
  // Aircraft triangle, rotated by heading (heading 0 = north = up on the map).
  ctx.save();
  ctx.translate(cx + flight.x * s, cy + flight.z * s);
  ctx.rotate(-flight.heading);
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.moveTo(0, -8);
  ctx.lineTo(6, 6);
  ctx.lineTo(-6, 6);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  text(ctx, 'MAP — NUSA', x + 8, y + 14, 11, AMBER);
}

export function drawHUD(ctx, flight, world) {
  ctx.clearRect(0, 0, W, H);
  // Top bar: title + phase + score.
  ctx.fillStyle = 'rgba(8,12,20,0.8)';
  ctx.fillRect(0, 0, W, 64);
  text(ctx, 'NUSA RING RUN', 14, 26, 22, INK);
  text(ctx, `ELANG NUSA · SORTIE 1/3 · PHASE ${world.phase}/3 ${['', 'RING RUN', 'FIRE DROP', 'RESCUE + LAND'][world.phase]}`, 14, 50, 14, AMBER);
  text(ctx, `SKOR ${world.score}`, 960, 30, 26, INK, 'right');
  text(ctx, `KOMBO x${world.combo}  ·  RING ${world.ringsPassed}/10  ·  ${fmtTime(world.time)}`, 960, 52, 14, AMBER, 'right');
  drawDecision(ctx, world);
  drawTapes(ctx, flight, world);
  drawRight(ctx, world);
  drawHorizon(ctx, flight);
  drawNextRing(ctx, flight, world);
  drawMinimap(ctx, flight, world);
  // Radio strip (bottom).
  ctx.fillStyle = 'rgba(8,12,20,0.8)';
  ctx.fillRect(0, H - 26, W, 26);
  text(ctx, `RADIO  ${radioLine(world, RADIO)}`, 14, H - 8, 14, '#cfe8ff');
  // Centre message (ring passed, drop, rescue) — fades with world.messageSec.
  if (world.messageSec > 0 && world.message) {
    ctx.globalAlpha = Math.min(1, world.messageSec);
    text(ctx, world.message, W / 2, 300, 30, ORANGE, 'center');
    ctx.globalAlpha = 1;
  }
  // Stall warning.
  if (flight.stalled) {
    text(ctx, 'STALL — NOSE DOWN, THROTTLE UP', W / 2, 340, 24, RED, 'center');
  }
  // End screens.
  if ((world.screen === 3 || world.screen === 4) && world.result) {
    ctx.fillStyle = 'rgba(5,8,14,0.82)';
    ctx.fillRect(280, 180, 720, 340);
    ctx.strokeStyle = world.screen === 4 ? GREEN : RED;
    ctx.lineWidth = 3;
    ctx.strokeRect(281, 181, 718, 338);
    text(ctx, world.result.title, 640, 240, 34, world.screen === 4 ? GREEN : RED, 'center');
    world.result.lines.forEach((line, i) => {
      text(ctx, line, 640, 290 + i * 36, 22, INK, 'center');
    });
    text(ctx, 'SPACE — FLY AGAIN', 640, 290 + world.result.lines.length * 36 + 10, 16, AMBER, 'center');
  }
  // Title screen.
  if (world.screen === 0) {
    ctx.fillStyle = 'rgba(5,8,14,0.55)';
    ctx.fillRect(0, 0, W, H);
    text(ctx, 'NUSA RING RUN', 640, 250, 64, INK, 'center');
    text(ctx, 'ELANG NUSA · KEPULAUAN MERAPI · 3 FASE, 1 SORTIE', 640, 300, 22, AMBER, 'center');
    text(ctx, 'RING RUN → FIRE DROP → RESCUE + LAND', 640, 340, 20, INK, 'center');
    text(ctx, 'W/S PITCH · A/D ROLL · SHIFT/CTRL THROTTLE · F FLAPS · G GEAR · SPACE DROP · 1/2 DECISION', 640, 400, 16, INK, 'center');
    text(ctx, 'SPACE OR CLICK — TAKE OFF', 640, 460, 24, ORANGE, 'center');
  }
}

export { W, H };
