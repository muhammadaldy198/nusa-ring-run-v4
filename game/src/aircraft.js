// Aircraft "Elang Nusa": built from Three.js primitives so it reads as a built
// aeroplane at 768x480 — fuselage, wings, tail, spinning prop, canopy, nav lights,
// gear. No imported model, no texture file: everything procedural, one style.
import * as THREE from 'three';

export function buildAircraft() {
  const plane = new THREE.Group();
  plane.name = 'elang-nusa';
  const bodyMat = new THREE.MeshLambertMaterial({ color: 0xe8e0cc });
  const accentMat = new THREE.MeshLambertMaterial({ color: 0xc23b2a });
  const darkMat = new THREE.MeshLambertMaterial({ color: 0x2b2b2e });
  const glassMat = new THREE.MeshLambertMaterial({ color: 0x9fd4e8, transparent: true, opacity: 0.3 });

  // Fuselage: nose cone + body + tail cone (nose points -Z, the flight direction).
  const body = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.1, 7.5, 10), bodyMat);
  body.rotation.x = Math.PI / 2;
  body.position.z = 0.5;
  const nose = new THREE.Mesh(new THREE.ConeGeometry(1.5, 2.6, 10), accentMat);
  nose.rotation.x = -Math.PI / 2;
  nose.position.z = -5.4;
  const tail = new THREE.Mesh(new THREE.ConeGeometry(1.1, 2.4, 10), bodyMat);
  tail.rotation.x = Math.PI / 2;
  tail.position.z = 5.4;
  plane.add(body, nose, tail);

  // Main wings (wide, slightly swept) + tailplane + fin.
  const wing = new THREE.Mesh(new THREE.BoxGeometry(15, 0.35, 2.6), bodyMat);
  wing.position.set(0, 0.2, -0.6);
  const wingTipL = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.4, 2.2), accentMat);
  wingTipL.position.set(-7.6, 0.2, -0.6);
  const wingTipR = wingTipL.clone();
  wingTipR.position.x = 7.6;
  const tailplane = new THREE.Mesh(new THREE.BoxGeometry(5.4, 0.3, 1.6), bodyMat);
  tailplane.position.set(0, 0.4, 5.6);
  const fin = new THREE.Mesh(new THREE.BoxGeometry(0.35, 2.6, 2.0), accentMat);
  fin.position.set(0, 1.5, 5.6);
  plane.add(wing, wingTipL, wingTipR, tailplane, fin);

  // Canopy (glass bubble the pilot sits under) + red cheatline stripe.
  const canopy = new THREE.Mesh(new THREE.SphereGeometry(1.25, 12, 8), glassMat);
  canopy.scale.set(1, 0.75, 1.7);
  canopy.position.set(0, 1.15, -2.2);
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(3.05, 0.5, 6.4), accentMat);
  stripe.position.set(0, -0.15, 0.6);
  plane.add(canopy, stripe);

  // Propeller: hub + two blades + a translucent spin disc (reads as motion).
  const prop = new THREE.Group();
  prop.name = 'propeller';
  const hub = new THREE.Mesh(new THREE.ConeGeometry(0.55, 1.4, 8), darkMat);
  hub.rotation.x = -Math.PI / 2;
  hub.position.z = -6.9;
  const bladeGeo = new THREE.BoxGeometry(0.5, 4.6, 0.18);
  const blade1 = new THREE.Mesh(bladeGeo, darkMat);
  const blade2 = blade1.clone();
  blade2.rotation.z = Math.PI / 2;
  prop.add(hub, blade1, blade2);
  prop.position.z = -6.9;
  const disc = new THREE.Mesh(
    new THREE.CircleGeometry(2.4, 24),
    new THREE.MeshBasicMaterial({ color: 0xcccccc, transparent: true, opacity: 0.18, side: THREE.DoubleSide }),
  );
  disc.position.z = -6.95;
  prop.add(disc);
  plane.add(prop);

  // Navigation lights: red port, green starboard, white tail (emissive dots).
  const navL = new THREE.Mesh(new THREE.SphereGeometry(0.28, 6, 4), new THREE.MeshBasicMaterial({ color: 0xff2222 }));
  navL.position.set(-7.9, 0.2, -0.6);
  const navR = new THREE.Mesh(new THREE.SphereGeometry(0.28, 6, 4), new THREE.MeshBasicMaterial({ color: 0x22ff44 }));
  navR.position.set(7.9, 0.2, -0.6);
  plane.add(navL, navR);

  // Landing gear: two mains + nose wheel, shown when gear is down.
  const gear = new THREE.Group();
  gear.name = 'gear';
  const wheelGeo = new THREE.CylinderGeometry(0.55, 0.55, 0.4, 10);
  wheelGeo.rotateZ(Math.PI / 2);
  for (const [x, z] of [[-2.2, -1.2], [2.2, -1.2], [0, -4.6]]) {
    const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 1.6, 6), darkMat);
    strut.position.set(x, -1.6, z);
    const wheel = new THREE.Mesh(wheelGeo, darkMat);
    wheel.position.set(x, -2.4, z);
    gear.add(strut, wheel);
  }
  plane.add(gear);

  plane.userData.prop = prop;
  plane.userData.gear = gear;
  plane.userData.canopy = canopy;
  plane.userData.blades = [blade1, blade2];

  // Cockpit dashboard: dark panel with six lit gauges, read from the pilot seat.
  // Hidden in cockpit view: the pilot sits inside the canopy, so the glass
  // itself must not fill the frame.
  const dash = new THREE.Mesh(
    new THREE.BoxGeometry(3.4, 1.0, 0.25),
    new THREE.MeshLambertMaterial({ color: 0x14141c }),
  );
  dash.position.set(0, 0.9, -3.0);
  plane.add(dash);
  const gaugeColors = [0xf5f0dc, 0xffb000, 0x7dd87d, 0xf5f0dc, 0xff5a4e, 0xf5f0dc];
  for (let i = 0; i < 6; i += 1) {
    const gauge = new THREE.Mesh(
      new THREE.CircleGeometry(0.22, 20),
      new THREE.MeshBasicMaterial({ color: gaugeColors[i] }),
    );
    gauge.position.set(-1.25 + i * 0.5, 1.05, -2.86);
    plane.add(gauge);
    const needle = new THREE.Mesh(
      new THREE.PlaneGeometry(0.03, 0.16),
      new THREE.MeshBasicMaterial({ color: 0x111111, side: THREE.DoubleSide }),
    );
    needle.position.set(-1.25 + i * 0.5, 1.05, -2.85);
    needle.rotation.z = (i - 2.5) * 0.45;
    plane.add(needle);
  }
  return plane;
}

/** Pose the aircraft from the flight state: position + heading + pitch + bank. */
export function poseAircraft(plane, flight) {
  plane.position.set(flight.x, flight.y, flight.z);
  plane.rotation.order = 'YXZ';
  plane.rotation.y = flight.heading;
  plane.rotation.x = flight.pitch;
  plane.rotation.z = flight.roll;
  plane.userData.prop.rotation.z += 0.6;
  plane.userData.gear.visible = flight.gear;
}
