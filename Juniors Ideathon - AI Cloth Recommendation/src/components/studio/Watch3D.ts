import * as THREE from 'three';

export type WatchColorVariant = 'silver' | 'gold' | 'black' | 'rosegold';

export function createWatchMesh(colorVariant: WatchColorVariant = 'gold'): THREE.Group {
  const group = new THREE.Group();
  group.name = 'LuxuryChronographWatch';

  // Determine material color palettes based on chosen finish
  let primaryMetal = '#D8DCE0';
  let accentMetal = '#D4AF37';
  let dialColor = '#121417';
  let strapColor = '#BDC3C7';
  let metalness = 0.92;
  let roughness = 0.22;

  if (colorVariant === 'silver') {
    primaryMetal = '#E2E6EB';
    accentMetal = '#C8D0D8';
    dialColor = '#1A1D20';
    strapColor = '#CCD2D8';
    roughness = 0.20;
  } else if (colorVariant === 'gold') {
    primaryMetal = '#D4AF37';
    accentMetal = '#E5C453';
    dialColor = '#181612';
    strapColor = '#C8A330';
    roughness = 0.18;
  } else if (colorVariant === 'black') {
    primaryMetal = '#1D1E22';
    accentMetal = '#2A2C33';
    dialColor = '#111214';
    strapColor = '#18191C';
    roughness = 0.35;
    metalness = 0.85;
  } else if (colorVariant === 'rosegold') {
    primaryMetal = '#C97D68';
    accentMetal = '#DB927E';
    dialColor = '#241815';
    strapColor = '#B86F5C';
    roughness = 0.19;
  }

  const caseMat = new THREE.MeshStandardMaterial({
    color: primaryMetal,
    metalness,
    roughness,
  });

  const bezelMat = new THREE.MeshStandardMaterial({
    color: accentMetal,
    metalness: 0.95,
    roughness: Math.max(0.12, roughness - 0.05),
  });

  const dialMat = new THREE.MeshStandardMaterial({
    color: dialColor,
    metalness: 0.4,
    roughness: 0.3,
  });

  const markerMat = new THREE.MeshStandardMaterial({
    color: colorVariant === 'black' ? '#E0E0E0' : '#FFFFFF',
    metalness: 0.9,
    roughness: 0.1,
  });

  const crystalMat = new THREE.MeshPhysicalMaterial({
    color: '#FFFFFF',
    transparent: true,
    opacity: 0.35,
    roughness: 0.05,
    metalness: 0.1,
    transmission: 0.8,
  });

  const handMat = new THREE.MeshStandardMaterial({
    color: accentMetal,
    metalness: 0.95,
    roughness: 0.15,
  });

  const accentRedMat = new THREE.MeshBasicMaterial({
    color: '#FF4A4A',
  });

  const strapMat = new THREE.MeshStandardMaterial({
    color: strapColor,
    metalness,
    roughness: roughness + 0.06,
  });

  // 1. Watch Case (Oyster Case)
  const caseGeom = new THREE.CylinderGeometry(0.018, 0.018, 0.007, 32);
  const caseMesh = new THREE.Mesh(caseGeom, caseMat);
  caseMesh.rotation.x = Math.PI / 2;
  group.add(caseMesh);

  // 2. Bezel (Fluted Rim)
  const bezelGeom = new THREE.TorusGeometry(0.0175, 0.002, 16, 40);
  const bezelMesh = new THREE.Mesh(bezelGeom, bezelMat);
  bezelMesh.position.z = 0.0035;
  group.add(bezelMesh);

  // 3. Dial Face
  const dialGeom = new THREE.CircleGeometry(0.016, 32);
  const dialMesh = new THREE.Mesh(dialGeom, dialMat);
  dialMesh.position.z = 0.0038;
  group.add(dialMesh);

  // 4. Dial Hour Markers (12 luxury tick markers)
  for (let i = 0; i < 12; i++) {
    const angle = (i / 12) * Math.PI * 2;
    const r = 0.0135;
    const marker = new THREE.Mesh(
      new THREE.BoxGeometry(0.0012, 0.0032, 0.0008),
      i % 3 === 0 ? bezelMat : markerMat
    );
    marker.position.set(Math.sin(angle) * r, Math.cos(angle) * r, 0.0041);
    marker.rotation.z = -angle;
    group.add(marker);
  }

  // 5. Chrono Subdials (3 mini rings at 3, 6, 9)
  const subOffsets = [
    [-0.006, 0.001],
    [0.006, 0.001],
    [0.0, -0.006]
  ];
  subOffsets.forEach(([sx, sy]) => {
    const subRing = new THREE.Mesh(
      new THREE.RingGeometry(0.0032, 0.004, 24),
      bezelMat
    );
    subRing.position.set(sx, sy, 0.004);
    group.add(subRing);
  });

  // 6. Watch Hands
  // Hour hand
  const hourHand = new THREE.Mesh(new THREE.BoxGeometry(0.0014, 0.008, 0.0006), handMat);
  hourHand.position.set(0.002, 0.0025, 0.0043);
  hourHand.rotation.z = -Math.PI / 4;
  group.add(hourHand);

  // Minute hand
  const minHand = new THREE.Mesh(new THREE.BoxGeometry(0.001, 0.012, 0.0006), handMat);
  minHand.position.set(0, 0.004, 0.0044);
  minHand.rotation.z = Math.PI / 3;
  group.add(minHand);

  // Red Chrono seconds hand
  const secHand = new THREE.Mesh(new THREE.BoxGeometry(0.0004, 0.014, 0.0004), accentRedMat);
  secHand.position.set(0, 0.002, 0.0045);
  secHand.rotation.z = -Math.PI / 6;
  group.add(secHand);

  // 7. Sapphire Crystal
  const crystal = new THREE.Mesh(new THREE.CircleGeometry(0.017, 32), crystalMat);
  crystal.position.z = 0.0048;
  group.add(crystal);

  // 8. Crown & Pushers (Right side)
  const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.002, 0.002, 0.003, 16), bezelMat);
  crown.rotation.z = Math.PI / 2;
  crown.position.set(0.0195, 0, 0);
  group.add(crown);

  const pusher1 = new THREE.Mesh(new THREE.CylinderGeometry(0.0015, 0.0015, 0.0025, 12), caseMat);
  pusher1.rotation.z = Math.PI / 2;
  pusher1.position.set(0.0185, 0.009, 0);
  group.add(pusher1);

  const pusher2 = new THREE.Mesh(new THREE.CylinderGeometry(0.0015, 0.0015, 0.0025, 12), caseMat);
  pusher2.rotation.z = Math.PI / 2;
  pusher2.position.set(0.0185, -0.009, 0);
  group.add(pusher2);

  // 9. Bracelet (Strap wrapping around wrist)
  const strapTop = new THREE.Mesh(
    new THREE.BoxGeometry(0.015, 0.016, 0.004),
    strapMat
  );
  strapTop.position.set(0, 0.022, -0.002);
  strapTop.rotation.x = 0.4;
  group.add(strapTop);

  const strapBottom = new THREE.Mesh(
    new THREE.BoxGeometry(0.015, 0.016, 0.004),
    strapMat
  );
  strapBottom.position.set(0, -0.022, -0.002);
  strapBottom.rotation.x = -0.4;
  group.add(strapBottom);

  return group;
}
