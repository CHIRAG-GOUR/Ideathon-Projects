import * as THREE from 'three';
import { Garment } from '../../types/fashion';

/**
 * Creates luxury designer eyewear with true adult human proportions (143mm wide, 40mm tall),
 * authentic contour browline, sculpted rims, transparent/gradient optical lenses,
 * 18k gold/platinum hardware accents, silicone nose pads, and wrap-around temples.
 */
export function createGlassesMesh(garment?: Garment | null): THREE.Group {
  const group = new THREE.Group();
  group.name = 'DesignerEyewear';

  const gId = garment?.id || 'acc-sunglasses-dual';
  const isAviator = gId.includes('aviator');
  const isClubmaster = gId.includes('clubmaster');
  const isRound = gId.includes('round');
  const isMinimal = gId.includes('minimal');

  // Materials selection
  let frameColor = '#141416'; // Classic deep onyx obsidian
  let frameRoughness = 0.16;
  let frameMetalness = 0.15;
  let hardwareColor = '#D4AF37'; // 18k brushed gold
  let lensColor = '#15241C'; // Polarized G-15 bottle green
  let lensOpacity = 0.65; // Clear enough to see avatar eyes and pupils behind glass

  if (isAviator) {
    frameColor = '#D4AF37';
    frameRoughness = 0.15;
    frameMetalness = 0.95;
    hardwareColor = '#D4AF37';
    lensColor = '#2E2014'; // Warm amber gradient
    lensOpacity = 0.68;
  } else if (isClubmaster) {
    frameColor = '#18161A';
    frameRoughness = 0.16;
    frameMetalness = 0.2;
    hardwareColor = '#D8DCE0'; // Polished silver / platinum
    lensColor = '#1A1C23'; // Classic smoke
    lensOpacity = 0.64;
  } else if (isRound) {
    frameColor = garment?.hexColor || '#5C3822'; // Havana Tortoiseshell
    frameRoughness = 0.22;
    frameMetalness = 0.1;
    hardwareColor = '#D4AF37';
    lensColor = '#EBF4F8'; // Anti-reflective clear optical lens
    lensOpacity = 0.26;
  } else if (isMinimal) {
    frameColor = '#3A3C42'; // Gunmetal titanium
    frameRoughness = 0.28;
    frameMetalness = 0.92;
    hardwareColor = '#3A3C42';
    lensColor = '#EDF6FA'; // Crystal clear
    lensOpacity = 0.22;
  } else if (garment?.hexColor) {
    frameColor = garment.hexColor;
  }

  const frameMat = new THREE.MeshStandardMaterial({
    color: frameColor,
    roughness: frameRoughness,
    metalness: frameMetalness,
    side: THREE.DoubleSide
  });

  const hardwareMat = new THREE.MeshStandardMaterial({
    color: hardwareColor,
    roughness: 0.16,
    metalness: 0.95
  });

  const lensMat = new THREE.MeshStandardMaterial({
    color: lensColor,
    roughness: 0.04,
    metalness: 0.08,
    transparent: true,
    opacity: lensOpacity,
    side: THREE.DoubleSide,
    depthWrite: false
  });

  const siliconePadMat = new THREE.MeshStandardMaterial({
    color: '#E0E8EB',
    roughness: 0.35,
    metalness: 0.05,
    transparent: true,
    opacity: 0.7
  });

  // 1. FRONT FRAME PROFILE (Left Half, origin at center of nose bridge)
  // Total span from X = 0 to X = 0.068 (mirrored gives 136-140mm width)
  const leftShape = new THREE.Shape();
  const leftHole = new THREE.Path();
  const lensShape = new THREE.Shape();

  if (isRound) {
    // Round Panto silhouette
    leftShape.moveTo(0, 0.010);
    leftShape.lineTo(0.010, 0.012);
    leftShape.quadraticCurveTo(0.034, 0.019, 0.058, 0.012);
    leftShape.lineTo(0.066, 0.008);
    leftShape.lineTo(0.066, 0.001);
    leftShape.quadraticCurveTo(0.058, -0.018, 0.034, -0.020);
    leftShape.quadraticCurveTo(0.012, -0.018, 0.010, 0.001);
    leftShape.quadraticCurveTo(0.005, 0.006, 0, 0.006);
    leftShape.closePath();

    leftHole.moveTo(0.014, 0.001);
    leftHole.quadraticCurveTo(0.014, 0.010, 0.034, 0.014);
    leftHole.quadraticCurveTo(0.054, 0.010, 0.054, 0.001);
    leftHole.quadraticCurveTo(0.054, -0.015, 0.034, -0.016);
    leftHole.quadraticCurveTo(0.014, -0.015, 0.014, 0.001);
    leftHole.closePath();

    lensShape.moveTo(0.014, 0.001);
    lensShape.quadraticCurveTo(0.014, 0.010, 0.034, 0.014);
    lensShape.quadraticCurveTo(0.054, 0.010, 0.054, 0.001);
    lensShape.quadraticCurveTo(0.054, -0.015, 0.034, -0.016);
    lensShape.quadraticCurveTo(0.014, -0.015, 0.014, 0.001);
    lensShape.closePath();
  } else if (isAviator) {
    // Teardrop Aviator silhouette
    leftShape.moveTo(0, 0.013);
    leftShape.lineTo(0.010, 0.014);
    leftShape.quadraticCurveTo(0.035, 0.017, 0.062, 0.015);
    leftShape.lineTo(0.067, 0.012);
    leftShape.lineTo(0.067, 0.004);
    leftShape.quadraticCurveTo(0.062, -0.008, 0.056, -0.016);
    leftShape.quadraticCurveTo(0.040, -0.025, 0.026, -0.022);
    leftShape.quadraticCurveTo(0.012, -0.018, 0.010, -0.002);
    leftShape.lineTo(0.009, 0.004);
    leftShape.quadraticCurveTo(0.005, 0.008, 0, 0.008);
    leftShape.closePath();

    leftHole.moveTo(0.013, 0.002);
    leftHole.lineTo(0.013, 0.010);
    leftHole.quadraticCurveTo(0.035, 0.014, 0.058, 0.011);
    leftHole.quadraticCurveTo(0.058, 0.000, 0.053, -0.012);
    leftHole.quadraticCurveTo(0.038, -0.021, 0.027, -0.018);
    leftHole.quadraticCurveTo(0.014, -0.014, 0.013, 0.002);
    leftHole.closePath();

    lensShape.moveTo(0.013, 0.002);
    lensShape.lineTo(0.013, 0.010);
    lensShape.quadraticCurveTo(0.035, 0.014, 0.058, 0.011);
    lensShape.quadraticCurveTo(0.058, 0.000, 0.053, -0.012);
    lensShape.quadraticCurveTo(0.038, -0.021, 0.027, -0.018);
    lensShape.quadraticCurveTo(0.014, -0.014, 0.013, 0.002);
    lensShape.closePath();
  } else {
    // Iconic Wayfarer & Clubmaster silhouette
    leftShape.moveTo(0, 0.012);
    leftShape.lineTo(0.012, 0.014);
    leftShape.quadraticCurveTo(0.035, 0.018, 0.060, 0.017);
    leftShape.lineTo(0.068, 0.014); // outer temple lug top
    leftShape.lineTo(0.068, 0.006); // outer temple lug bottom
    leftShape.quadraticCurveTo(0.060, 0.004, 0.056, -0.005);
    leftShape.quadraticCurveTo(0.052, -0.022, 0.035, -0.022); // bottom cheek curve
    leftShape.quadraticCurveTo(0.016, -0.021, 0.011, -0.008);
    leftShape.lineTo(0.010, 0.003);
    leftShape.quadraticCurveTo(0.005, 0.007, 0, 0.007);
    leftShape.closePath();

    leftHole.moveTo(0.014, 0.004);
    leftHole.lineTo(0.015, 0.010);
    leftHole.quadraticCurveTo(0.035, 0.014, 0.054, 0.012);
    leftHole.quadraticCurveTo(0.055, 0.002, 0.051, -0.005);
    leftHole.quadraticCurveTo(0.047, -0.018, 0.035, -0.018);
    leftHole.quadraticCurveTo(0.020, -0.017, 0.016, -0.006);
    leftHole.closePath();

    lensShape.moveTo(0.014, 0.004);
    lensShape.lineTo(0.015, 0.010);
    lensShape.quadraticCurveTo(0.035, 0.014, 0.054, 0.012);
    lensShape.quadraticCurveTo(0.055, 0.002, 0.051, -0.005);
    lensShape.quadraticCurveTo(0.047, -0.018, 0.035, -0.018);
    lensShape.quadraticCurveTo(0.020, -0.017, 0.016, -0.006);
    lensShape.closePath();
  }

  leftShape.holes.push(leftHole);

  const extrudeSettings: THREE.ExtrudeGeometryOptions = {
    depth: 0.0028,
    bevelEnabled: true,
    bevelSegments: 2,
    steps: 1,
    bevelSize: 0.0006,
    bevelThickness: 0.0006
  };

  // Left Front Frame
  const leftFrontGeom = new THREE.ExtrudeGeometry(leftShape, extrudeSettings);
  const leftFront = new THREE.Mesh(leftFrontGeom, frameMat);
  leftFront.castShadow = true;
  group.add(leftFront);

  // Right Front Frame (Mirrored X)
  const rightFront = leftFront.clone();
  rightFront.scale.set(-1, 1, 1);
  group.add(rightFront);

  // Left & Right Lenses (embedded inside the cutouts)
  const leftLensGeom = new THREE.ShapeGeometry(lensShape);
  const leftLens = new THREE.Mesh(leftLensGeom, lensMat);
  leftLens.position.set(0, 0, 0.0016);
  group.add(leftLens);

  const rightLens = leftLens.clone();
  rightLens.scale.set(-1, 1, 1);
  group.add(rightLens);

  // 2. HARDWARE DETAILS: Rivets & Nose Bridge Accent
  // Corner rivets on outer lugs
  const rivetGeom = new THREE.CylinderGeometry(0.0008, 0.0008, 0.0022, 8);
  const leftRivet = new THREE.Mesh(rivetGeom, hardwareMat);
  leftRivet.rotation.x = Math.PI / 2;
  leftRivet.position.set(0.063, 0.010, 0.0035);
  group.add(leftRivet);

  const rightRivet = new THREE.Mesh(rivetGeom, hardwareMat);
  rightRivet.rotation.x = Math.PI / 2;
  rightRivet.position.set(-0.063, 0.010, 0.0035);
  group.add(rightRivet);

  // Arched metallic nose bridge clip / accent
  const bridgeAccent = new THREE.Mesh(
    new THREE.CylinderGeometry(0.0009, 0.0009, 0.018, 8),
    hardwareMat
  );
  bridgeAccent.rotation.z = Math.PI / 2;
  bridgeAccent.position.set(0, 0.010, 0.0034);
  group.add(bridgeAccent);

  // Top Brow Bar for Aviator style
  if (isAviator) {
    const browBar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.0007, 0.0007, 0.116, 8),
      hardwareMat
    );
    browBar.rotation.z = Math.PI / 2;
    browBar.position.set(0, 0.017, 0.002);
    group.add(browBar);
  }

  // 3. SILICONE NOSE PADS (Comfortably flanking the nasal bone)
  const padGeom = new THREE.BoxGeometry(0.0022, 0.0055, 0.0035);
  const leftPad = new THREE.Mesh(padGeom, siliconePadMat);
  leftPad.position.set(0.011, -0.005, -0.003);
  leftPad.rotation.set(0.2, -0.25, -0.15);
  group.add(leftPad);

  const rightPad = new THREE.Mesh(padGeom, siliconePadMat);
  rightPad.position.set(-0.011, -0.005, -0.003);
  rightPad.rotation.set(0.2, 0.25, 0.15);
  group.add(rightPad);

  // 4. TEMPLES (ARMS)
  // Perfectly sized to human temple width: starts at X = 0.067, hugs head at X = 0.070, hooks over ears
  const templeArmRadius = (isAviator || isMinimal) ? 0.0010 : 0.0014;

  const leftTempleCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.067, 0.010, 0.001),
    new THREE.Vector3(0.070, 0.009, -0.030),
    new THREE.Vector3(0.070, 0.007, -0.065),
    new THREE.Vector3(0.068, -0.006, -0.085),
    new THREE.Vector3(0.066, -0.016, -0.095)
  ]);
  const leftTemple = new THREE.Mesh(
    new THREE.TubeGeometry(leftTempleCurve, 20, templeArmRadius, 8, false),
    frameMat
  );
  leftTemple.castShadow = true;
  group.add(leftTemple);

  const rightTempleCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.067, 0.010, 0.001),
    new THREE.Vector3(-0.070, 0.009, -0.030),
    new THREE.Vector3(-0.070, 0.007, -0.065),
    new THREE.Vector3(-0.068, -0.006, -0.085),
    new THREE.Vector3(-0.066, -0.016, -0.095)
  ]);
  const rightTemple = new THREE.Mesh(
    new THREE.TubeGeometry(rightTempleCurve, 20, templeArmRadius, 8, false),
    frameMat
  );
  rightTemple.castShadow = true;
  group.add(rightTemple);

  return group;
}
