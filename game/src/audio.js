// Audio: engine + wind synthesised live with Web Audio — no sound files, no network.
// The engine hum follows throttle; the wind rises with speed. Silent until the first
// user gesture (browser autoplay rules); staged screenshots never need it.
export function createAudio() {
  return { ctx: null, engine: null, engineGain: null, wind: null, windGain: null, started: false };
}

export function startAudio(audio) {
  if (audio.started) return;
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    audio.ctx = ctx;
    // Engine: two detuned saws through a low-pass, gain follows throttle.
    const engine = ctx.createOscillator();
    engine.type = 'sawtooth';
    engine.frequency.value = 55;
    const engine2 = ctx.createOscillator();
    engine2.type = 'sawtooth';
    engine2.frequency.value = 55.7;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 420;
    const gain = ctx.createGain();
    gain.gain.value = 0.0;
    engine.connect(filter);
    engine2.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    engine.start();
    engine2.start();
    // Wind: filtered noise, gain follows speed.
    const buf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;
    const noise = ctx.createBufferSource();
    noise.buffer = buf;
    noise.loop = true;
    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.value = 600;
    const windGain = ctx.createGain();
    windGain.gain.value = 0.0;
    noise.connect(noiseFilter);
    noiseFilter.connect(windGain);
    windGain.connect(ctx.destination);
    noise.start();
    audio.engine = engine;
    audio.engineGain = gain;
    audio.windGain = windGain;
    audio.started = true;
  } catch {
    // Audio is decoration: a failure here never stops the game.
  }
}

export function updateAudio(audio, flight) {
  if (!audio.started || !audio.ctx) return;
  const t = audio.ctx.currentTime;
  audio.engineGain.gain.setTargetAtTime(0.05 + flight.throttle * 0.09, t, 0.1);
  if (audio.engine) audio.engine.frequency.setTargetAtTime(45 + flight.throttle * 70, t, 0.1);
  audio.windGain.gain.setTargetAtTime(Math.min(0.12, flight.speedKt / 1400), t, 0.2);
}
