// Input: keyboard + mouse, the standard flight-sim scheme (W/S pitch, A/D roll,
// Q/E rudder, Shift/Ctrl throttle, F flaps, G gear, B brake, C camera, M map,
// P pause, Space drop/confirm, 1/2 answer the DECISION). Mouse drag looks around;
// click confirms. No key is read twice in one frame.
export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_DROP = 4;
export const ACTION_CAMERA = 8;

export function createInput(canvas) {
  const keys = new Set();
  const input = {
    keys,
    actions: 0,
    decisionKey: null, // '1' | '2' pressed this frame
    lookX: 0,
    lookY: 0,
  };
  window.addEventListener('keydown', (e) => {
    if (e.repeat) return;
    keys.add(e.code);
    if (e.code === 'Space' || e.code === 'Enter') input.actions |= ACTION_CONFIRM | ACTION_DROP;
    if (e.code === 'KeyP' || e.code === 'Escape') input.actions |= ACTION_PAUSE;
    if (e.code === 'KeyC') input.actions |= ACTION_CAMERA;
    if (e.code === 'Digit1') input.decisionKey = '1';
    if (e.code === 'Digit2') input.decisionKey = '2';
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
  });
  window.addEventListener('keyup', (e) => keys.delete(e.code));
  canvas.addEventListener('mousedown', () => {
    input.actions |= ACTION_CONFIRM;
  });
  let dragging = false;
  let lastX = 0;
  let lastY = 0;
  canvas.addEventListener('mousedown', (e) => { dragging = true; lastX = e.clientX; lastY = e.clientY; });
  window.addEventListener('mouseup', () => { dragging = false; });
  window.addEventListener('mousemove', (e) => {
    if (!dragging) return;
    input.lookX += e.clientX - lastX;
    input.lookY += e.clientY - lastY;
    lastX = e.clientX;
    lastY = e.clientY;
  });
  return input;
}

/** Per-frame control state from the held keys. */
export function readControls(input) {
  const k = input.keys;
  const pitch = (k.has('KeyW') || k.has('ArrowUp') ? -1 : 0) + (k.has('KeyS') || k.has('ArrowDown') ? 1 : 0);
  const roll = (k.has('KeyD') || k.has('ArrowRight') ? 1 : 0) + (k.has('KeyA') || k.has('ArrowLeft') ? -1 : 0);
  const throttleDelta = (k.has('ShiftLeft') || k.has('ShiftRight') ? 0.6 : 0) +
    (k.has('ControlLeft') || k.has('ControlRight') ? -0.6 : 0);
  return { pitch, roll, throttleDelta, brake: k.has('KeyB') };
}

export function takeActions(input) {
  const a = input.actions;
  input.actions = 0;
  const d = input.decisionKey;
  input.decisionKey = null;
  return { actions: a, decisionKey: d };
}
