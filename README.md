# nusa-ring-run-v4

[![make.fun · best-flight-game-20261126-0057](https://make.fun/badge/best-flight-game-20261126-0057.svg)](https://make.fun/bounty/best-flight-game-20261126-0057?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)
[![rank](https://make.fun/badge/best-flight-game-20261126-0057/muhammadaldy198/nusa-ring-run-v4/rank.svg)](https://make.fun/bounty/best-flight-game-20261126-0057/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)
[![reward](https://make.fun/badge/best-flight-game-20261126-0057/muhammadaldy198/nusa-ring-run-v4/reward.svg)](https://make.fun/bounty/best-flight-game-20261126-0057?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)

**NUSA RING RUN — fly Elang Nusa around Kepulauan Merapi in one sortie with three
phases and one real decision.** Take off from runway 36 at Lapangan Terbang Nusa,
fly ten named rings (Gerbang Merapi → Lembah Sawah → Tanjung Mercusuar → Teluk
Nelayan → Danau Nusa → Pasar Apung → Lereng Api → Gerbang Damar → Dermaga Nusa →
Pendekatan Akhir), drop water on the ridge fire, rescue three fishermen, and land.

After ring 6 the tower opens a **BINGO FUEL decision**: 124 kg aboard, RTB needs
118 kg, pressing on needs 165 kg. **[1] RTB NOW** lands safe and keeps the score;
**[2] PRESS ON** chases +600 points and the fire, rescue and landing phases — on
fuel that does not quite cover them. A storm wall counts down behind you and the
fire line counts down ahead of you. The decision is real: press on and the tank
can run dry over the sea (ditch = lose 50% of your score).

## How to play

- **W/S** pitch · **A/D** roll · **Q/E** rudder · **Shift/Ctrl** throttle
- **F** flaps · **G** gear · **B** brake · **C** camera (chase ↔ cockpit)
- **Space** water drop (over the fire, below 600 ft) · **1/2** answer the decision
- **P** pause · mouse drag to look · click to confirm

Land on runway 36 inside the window: 55–95 kt, sink under 600 fpm, wings level,
gear down. Too fast, too steep or too banked is a crash; out of fuel over the sea
is a ditch.

## The game

- **Three.js** (vendored as `game/vendor/three.module.min.js`), WebGL2, no network
  requests, no build step — static files only.
- Procedural island from a fixed seed: volcano Merapi, rice terraces, Danau Nusa,
  fishing village, lighthouse, floating market, home runway.
- Dense HUD: ALT/SPD/HDG tapes, throttle, fuel gauge with the BINGO line, damage,
  artificial horizon, next-ring arrow, minimap, FIRE OPS, threat countdowns, goals
  counter, radio strip, and the DECISION panel.
- Engine + wind synthesised live with Web Audio (no sound files).
- Deterministic: the same seed always stages the same screenshots; `main.ts`
  writes `game/`, `screenshots/` and `dossier.json` to `/output` twice with
  byte-identical results.

Run it: `node serve.ts`, then open http://localhost:8080.

Referral: `3p0axm2p`
