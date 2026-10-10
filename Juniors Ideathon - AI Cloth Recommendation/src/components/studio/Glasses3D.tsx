import * as THREE from 'three';
import { Garment } from '../../types/fashion';

/**
 * Creates luxury designer eyewear with contoured, beveled rims,
 * semi-transparent lenses, anatomically fitted bridge & nose pads,
 * corner rivets, and curved temples that wrap naturally around the ears.
 */
export function createGlassesMesh(garment?: Garment | null): THREE.Group {
  const group = new THREE.Group();
  group.name = 'DesignerEyewear';

  const gId = garment?.id || 'acc-sunglasses-dual';
  const isAviator = gId.includes('aviator');
  const isClubmaster = gId.includes('clubmaster');
  const isRound = gId.includes('round');
  const isMinimal = gId.includes('minimal');
  const isClearLens = isRound || isMinimal;

  // Frame colors & materials
  let frameColor = '#18171B'; // Deep obsidian acetate
  let frameRoughness = 0.18;
  let frameMetalness = 0.2;
  let hardwareColor = '#D4AF37'; // 18k brushed gold
  let lensColor = '#15241C'; // Polarized G-15 bottle green
  let lensOpacity = 0.58; // See-through so eyes and eyelids are visible

  if (isAviator) {
    frameColor = '#D4AF37';
    frameRoughness = 0.15;
    frameMetalness = 0.95;
    hardwareColor = '#D4AF37';
    lensColor = '#2A1F14'; // Amber gradient
    lensOpacity = 0.62;
  } else if (isClubmaster) {
    frameColor = '#1A181C';
    frameRoughness = 0.16;
    frameMetalness = 0.2;
    hardwareColor = '#D8DCE0'; // Polished silver / platinum
    lensColor = '#1C1D24'; // Smoke grey
    lensOpacity = 0.60;
  } else if (isRound) {
    frameColor = garment?.hexColor || '#5C3822'; // Havana Tortoiseshell
    frameRoughness = 0.22;
    frameMetalness = 0.1;
    hardwareColor = '#D4AF37';
    lensColor = '#EBF4F8'; // Anti-reflective clear glass
    lensOpacity = 0.26;
  } else if (isMinimal) {
    frameColor = '#3A3C42'; // Gunmetal titanium
    frameRoughness = 0.3;
    frameMetalness = 0.9;
    hardwareColor = '#3A3C42';
    lensColor = '#EDF6FA'; // Crystal clear
    lensOpacity = 0.22;
  } else if (garment?.hexColor) {
    frameColor = garment.hexColor;
  }

  // 1. Materials
  const frameMat = new THREE.MeshStandardMaterial({
    color: frameColor,
    roughness: frameRoughness,
    metalness: frameMetalness,
    side: THREE.DoubleSide
  });

  const hardwareMat = new THREE.MeshStandardMaterial({
    color: hardwareColor,
    roughness: 0.2,
    metalness: 0.95
  });

  const lensMat = new THREE.MeshStandardMaterial({
    color: lensColor,
    roughness: 0.06,
    metalness: 0.08,
    transparent: true,
    opacity: lensOpacity,
    side: THREE.DoubleSide,
    depthWrite: false
  });

  const siliconePadMat = new THREE.MeshStandardMaterial({
    color: '#E0E8EB',
    roughness: 0.3,
    metalness: 0.05,
    transparent: true,
    opacity: 0.75
  });

  // 2. Geometry helpers
  // Creates a contour rim shape with a true cutout hole in the center
  const rimWidth = isRound ? 0.033 : (isAviator ? 0.037 : 0.035);
  const rimHeight = isRound ? 0.030 : (isAviator ? 0.030 : 0.024);
  const cornerRadius = isRound ? 0.014 : (isAviator ? 0.011 : 0.006);
  const borderThickness = (isAviator || isMinimal) ? 0.0016 : 0.0032;

  function buildRimShape(w: number, h: number, r: number, t: number) {
    const s = new THREE.Shape();
    const w2 = w / 2;
    const h2 = h / 2;
    const cr = Math.min(r, w2 - 0.001, h2 - 0.001);

    // Outer perimeter (clockwise)
    s.moveTo(-w2 + cr, -h2);
    s.lineTo(w2 - cr, -h2);
    s.quadraticCurveTo(w2, -h2, w2, -h2 + cr);
    s.lineTo(w2, h2 - cr);
    s.quadraticCurveTo(w2, h2, w2 - cr, h2);
    s.lineTo(-w2 + cr, h2);
    s.quadraticCurveTo(-w2, h2, -w2, h2 - cr);
    s.lineTo(-w2, -h2 + cr);
    s.quadraticCurveTo(-w2, -h2, -w2 + cr, -h2);

    // Inner cutout hole (counter-clockwise)
    const hole = new THREE.Path();
    const iw2 = Math.max(0.004, w2 - t);
    const ih2 = Math.max(0.004, h2 - t);
    const icr = Math.max(0.001, cr - t);

    hole.moveTo(-iw2 + icr, -ih2);
    hole.quadraticCurveTo(-iw2, -ih2, -iw2, -ih2 + icr);
    hole.lineTo(-iw2, ih2 - icr);
    hole.quadraticCurveTo(-iw2, ih2, -iw2 + icr, ih2);
    hole.lineTo(iw2 - icr, ih2);
    hole.quadraticCurveTo(iw2, ih2, iw2, ih2 - icr);
    hole.lineTo(iw2, -ih2 + icr);
    hole.quadraticCurveTo(iw2, -ih2, iw2 - icr, -ih2);
    hole.lineTo(-iw2 + icr, -ih2);

    s.holes.push(hole);
    return s;
  }

  function buildLensShape(w: number, h: number, r: number, t: number) {
    const s = new THREE.Shape();
    const iw2 = (w / 2) - t + 0.0006;
    const ih2 = (h / 2) - t + 0.0006;
    const icr = Math.max(0.001, r - t);

    s.moveTo(-iw2 + icr, -ih2);
    s.lineTo(iw2 - icr, -ih2);
    s.quadraticCurveTo(iw2, -ih2, iw2, -ih2 + icr);
    s.lineTo(iw2, ih2 - icr);
    s.quadraticCurveTo(iw2, ih2, iw2 - icr, ih2);
    s.lineTo(-iw2 + icr, ih2);
    s.quadraticCurveTo(-iw2, ih2, -iw2, ih2 - icr);
    s.lineTo(-iw2, -ih2 + icr);
    s.quadraticCurveTo(-iw2, -ih2, -iw2 + icr, -ih2);
    return s;
  }

  const rimShape = buildRimShape(rimWidth, rimHeight, cornerRadius, borderThickness);
  const lensShape = buildLensShape(rimWidth, rimHeight, cornerRadius, borderThickness);

  const extrudeSettings: THREE.ExtrudeGeometryOptions = {
    depth: borderThickness * 1.2,
    bevelEnabled: true,
    bevelSegments: 2,
    steps: 1,
    bevelSize: 0.0006,
    bevelThickness: 0.0006
  };

  const rimGeom = new THREE.ExtrudeGeometry(rimShape, extrudeSettings);
  rimGeom.center();

  const lensGeom = new THREE.ShapeGeometry(lensShape);
  lensGeom.center();

  // Eye spacing (inter-pupillary distance center)
  const eyeOffset = 0.0245;

  // 3. Left Eye Assembly (+X) with subtle face-form wrap (-4 deg)
  const leftAssembly = new THREE.Group();
  leftAssembly.position.set(eyeOffset, 0, 0);
  leftAssembly.rotation.y = -0.07;

  const leftRim = new THREE.Mesh(rimGeom, frameMat);
  leftRim.castShadow = true;
  leftAssembly.add(leftRim);

  const leftLens = new THREE.Mesh(lensGeom, lensMat);
  leftLens.position.set(0, 0, 0.0002);
  leftAssembly.add(leftLens);

  // Left corner hinge rivet accent
  const leftRivet = new THREE.Mesh(
    new THREE.CylinderGeometry(0.0007, 0.0007, 0.002, 8),
    hardwareMat
  );
  leftRivet.rotation.x = Math.PI / 2;
  leftRivet.position.set(rimWidth / 2 - 0.002, rimHeight / 2 - 0.003, 0.002);
  leftAssembly.add(leftRivet);

  group.add(leftAssembly);

  // 4. Right Eye Assembly (-X) with subtle face-form wrap (+4 deg)
  const rightAssembly = new THREE.Group();
  rightAssembly.position.set(-eyeOffset, 0, 0);
  rightAssembly.rotation.y = 0.07;

  const rightRim = new THREE.Mesh(rimGeom, frameMat);
  rightRim.castShadow = true;
  rightAssembly.add(rightRim);

  const rightLens = new THREE.Mesh(lensGeom, lensMat);
  rightLens.position.set(0, 0, 0.0002);
  rightAssembly.add(rightLens);

  // Right corner hinge rivet accent
  const rightRivet = new THREE.Mesh(
    new THREE.CylinderGeometry(0.0007, 0.0007, 0.002, 8),
    hardwareMat
  );
  rightRivet.rotation.x = Math.PI / 2;
  rightRivet.position.set(-rimWidth / 2 + 0.002, rimHeight / 2 - 0.003, 0.002);
  rightAssembly.add(rightRivet);

  group.add(rightAssembly);

  // 5. High-Fashion Nose Bridge spanning the nasal bone
  const bridgeCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.008, 0.001, 0.001),
    new THREE.Vector3(0, 0.004, 0.003),
    new THREE.Vector3(0.008, 0.001, 0.001)
  ]);
  const bridgeGeom = new THREE.TubeGeometry(bridgeCurve, 12, (isAviator || isMinimal) ? 0.0008 : 0.0012, 8, false);
  const bridgeMesh = new THREE.Mesh(bridgeGeom, hardwareMat);
  group.add(bridgeMesh);

  // Top Brow Bar (Aviator double-bridge signature)
  if (isAviator) {
    const topBar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.0007, 0.0007, 0.062, 8),
      hardwareMat
    );
    topBar.rotation.z = Math.PI / 2;
    topBar.position.set(0, rimHeight / 2 + 0.001, 0.001);
    group.add(topBar);
  }

  // 6. Silicone Nose Pads (resting on both sides of the nose)
  const leftPad = new THREE.Mesh(
    new THREE.BoxGeometry(0.002, 0.005, 0.003),
    siliconePadMat
  );
  leftPad.position.set(0.0075, -0.004, -0.003);
  leftPad.rotation.set(0.2, -0.3, -0.2);
  group.add(leftPad);

  const rightPad = new THREE.Mesh(
    new THREE.BoxGeometry(0.002, 0.005, 0.003),
    siliconePadMat
  );
  rightPad.position.set(-0.0075, -0.004, -0.003);
  rightPad.rotation.set(0.2, 0.3, 0.2);
  group.add(rightPad);

  // 7. Sculpted Temples (arms) extending backwards over the ears
  const templeArmRadius = (isAviator || isMinimal) ? 0.0008 : 0.0012;
  const outerX = eyeOffset + (rimWidth / 2) - 0.0015;

  // Left Temple Arm
  const leftTempleCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(outerX, 0.002, 0.001),
    new THREE.Vector3(outerX + 0.002, 0.003, -0.035),
    new THREE.Vector3(outerX + 0.002, 0.002, -0.075),
    new THREE.Vector3(outerX, -0.012, -0.098) // curved ear hook behind ear
  ]);
  const leftTemple = new THREE.Mesh(
    new THREE.TubeGeometry(leftTempleCurve, 20, templeArmRadius, 8, false),
    frameMat
  );
  group.add(leftTemple);

  // Right Temple Arm
  const rightTempleCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-outerX, 0.002, 0.001),
    new THREE.Vector3(-outerX - 0.002, 0.003, -0.035),
    new THREE.Vector3(-outerX - 0.002, 0.002, -0.075),
    new THREE.Vector3(-outerX, -0.012, -0.098) // curved ear hook behind ear
  ]);
  const rightTemple = new THREE.Mesh(
    new THREE.TubeGeometry(rightTempleCurve, 20, templeArmRadius, 8, false),
    frameMat
  );
  group.add(rightTemple);

  return group;
}
