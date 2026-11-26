// Cameras: chase (lazy follow, never fights the pilot) and cockpit (from the pilot
// seat, over the dashboard and the nose). The chase camera eases toward its target
// instead of snapping — the drift is cinematic, the pilot keeps control.
import * as THREE from 'three';
import { headingVector } from './flight.js';

export function createCameras() {
  return {
    mode: 'chase', // 'chase' | 'cockpit'
    chasePos: new THREE.Vector3(0, 40, 60),
    chaseLook: new THREE.Vector3(0, 20, 0),
  };
}

export function updateCamera(cams, camera, flight, dt, plane = null) {
  const fwd = headingVector(flight);
  if (cams.mode === 'cockpit' && plane) {
    // True cockpit view: from the pilot seat, over the dashboard and the nose.
    // The eye sits high (2.2 m) so the fat fuselage reads as a thin nose sliver
    // at the bottom of the frame instead of a grey hill filling the glass.
    const eye = plane.localToWorld(new THREE.Vector3(0, 2.2, 0.2));
    const ahead = plane.localToWorld(new THREE.Vector3(0, 0.6, -220));
    camera.position.copy(eye);
    camera.up.set(0, 1, 0);
    camera.lookAt(ahead);
    camera.fov = 68;
    camera.updateProjectionMatrix();
    return;
  }
  // Chase: behind and above, easing (position rate 2.5, look rate 3.0 — birdybird).
  const want = new THREE.Vector3(
    flight.x - fwd.x * 26 + Math.sin(flight.roll) * 4,
    flight.y - fwd.y * 26 + 7.5,
    flight.z - fwd.z * 26,
  );
  const look = new THREE.Vector3(flight.x + fwd.x * 90, flight.y + fwd.y * 90, flight.z + fwd.z * 90);
  cams.chasePos.lerp(want, Math.min(1, dt * 2.5));
  cams.chaseLook.lerp(look, Math.min(1, dt * 3.0));
  camera.position.copy(cams.chasePos);
  camera.lookAt(cams.chaseLook);
  camera.up.set(0, 1, 0);
  // A touch of roll with the bank so the horizon tilts like the aircraft does.
  camera.rotation.z += flight.roll * 0.12;
}

/** Snap the chase camera to the aircraft at once — staged shots paint only twice,
// so the easing never catches up; the snap puts the aircraft in the frame now. */
export function snapCamera(cams, camera, flight, plane = null) {
  const fwd = headingVector(flight);
  if (cams.mode === 'cockpit') {
    updateCamera(cams, camera, flight, 1, plane);
    return;
  }
  cams.chasePos.set(
    flight.x - fwd.x * 26 + Math.sin(flight.roll) * 4,
    flight.y - fwd.y * 26 + 7.5,
    flight.z - fwd.z * 26,
  );
  cams.chaseLook.set(flight.x + fwd.x * 90, flight.y + fwd.y * 90, flight.z + fwd.z * 90);
  camera.position.copy(cams.chasePos);
  camera.lookAt(cams.chaseLook);
  camera.up.set(0, 1, 0);
}
