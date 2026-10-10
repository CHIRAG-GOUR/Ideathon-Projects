import * as THREE from 'three';

/**
 * Creates luxury designer acetate sunglasses with polarized lenses,
 * sleek gold wire bridge, and temples that fit comfortably on the nose bridge
 * with zero clipping into the eye sockets.
 */
export function createGlassesMesh(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'DesignerSunglasses';

  // Materials: Glossy onyx acetate frame + 18k brushed gold hardware
  const frameMat = new THREE.MeshStandardMaterial({
    color: '#18161A',
    roughness: 0.15,
    metalness: 0.6
  });

  // Mirror-polarized tinted glass lenses with clean specular reflections
  const lensMat = new THREE.MeshStandardMaterial({
    color: '#081410',
    roughness: 0.04,
    metalness: 0.9,
    transparent: true,
    opacity: 0.88
  });

  const goldMat = new THREE.MeshStandardMaterial({
    color: '#D4AF37',
    roughness: 0.18,
    metalness: 0.95
  });

  // 1. Sleek Flat Front Eyewear Chassis (avoids any 3D geometry clipping into eye sockets)
  const lensWidth = 0.034;
  const lensHeight = 0.024;
  const frameThickness = 0.0025;

  // Left Lens & Acetate Rim (Avatar's Left Eye = +X)
  const leftRim = new THREE.Mesh(
    new THREE.BoxGeometry(lensWidth + 0.005, lensHeight + 0.005, frameThickness),
    frameMat
  );
  leftRim.position.set(0.033, 0, 0);
  group.add(leftRim);

  const leftLens = new THREE.Mesh(
    new THREE.BoxGeometry(lensWidth, lensHeight, frameThickness + 0.001),
    lensMat
  );
  leftLens.position.set(0.033, 0, 0.0005);
  group.add(leftLens);

  // Right Lens & Acetate Rim (Avatar's Right Eye = -X)
  const rightRim = new THREE.Mesh(
    new THREE.BoxGeometry(lensWidth + 0.005, lensHeight + 0.005, frameThickness),
    frameMat
  );
  rightRim.position.set(-0.033, 0, 0);
  group.add(rightRim);

  const rightLens = new THREE.Mesh(
    new THREE.BoxGeometry(lensWidth, lensHeight, frameThickness + 0.001),
    lensMat
  );
  rightLens.position.set(-0.033, 0, 0.0005);
  group.add(rightLens);

  // 2. Gold Nose Bridge connecting rims over the nasal bridge
  const bridge = new THREE.Mesh(
    new THREE.CylinderGeometry(0.0012, 0.0012, 0.016, 12),
    goldMat
  );
  bridge.rotation.z = Math.PI / 2;
  bridge.position.set(0, 0.004, 0.002);
  group.add(bridge);

  // Top Brow Bar (Aviator/Wayfarer accent)
  const browBar = new THREE.Mesh(
    new THREE.CylinderGeometry(0.001, 0.001, 0.076, 12),
    goldMat
  );
  browBar.rotation.z = Math.PI / 2;
  browBar.position.set(0, 0.015, 0.0025);
  group.add(browBar);

  // 3. Sleek Temples extending backwards over ears
  const leftTemple = new THREE.Mesh(
    new THREE.CylinderGeometry(0.0012, 0.001, 0.11, 10),
    frameMat
  );
  leftTemple.rotation.x = Math.PI / 2;
  leftTemple.position.set(0.052, 0.005, -0.054);
  group.add(leftTemple);

  const rightTemple = new THREE.Mesh(
    new THREE.CylinderGeometry(0.0012, 0.001, 0.11, 10),
    frameMat
  );
  rightTemple.rotation.x = Math.PI / 2;
  rightTemple.position.set(-0.052, 0.005, -0.054);
  group.add(rightTemple);

  return group;
}
