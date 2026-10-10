import * as THREE from 'three';
import { Garment } from '../../types/fashion';
import { getGarmentTexture } from '../../services/textureGenerator';

export interface BottomGarmentLayersController {
  updateGarments: (bottoms: Garment | null | undefined, skinTone: string) => void;
  dispose: () => void;
}

/**
 * Controller for lower body garments:
 * - When Shorts are equipped: separates bottom into Shorts (above knee) and Bare Legs (skin tone below knee).
 * - When Cargo Pants are equipped: displays full pants plus 3D cargo side flap pockets on the thighs.
 * - When Jeans/Trousers are equipped: displays clean full length pants.
 */
export function createBottomGarmentLayers(
  bottomMesh: THREE.SkinnedMesh,
  bonesMap: { LeftUpLeg?: THREE.Bone; RightUpLeg?: THREE.Bone }
): BottomGarmentLayersController | null {
  const origGeom = bottomMesh.geometry;
  if (!origGeom || !origGeom.index) return null;

  const posAttr = origGeom.attributes.position;
  const indexAttr = origGeom.index;
  const numIndices = indexAttr.count;
  const numTriangles = numIndices / 3;
  const indices = indexAttr.array;

  // Split triangles at knee level (Y = 0.54)
  const shortsIndices: number[] = [];
  const bareLegsIndices: number[] = [];

  for (let t = 0; t < numTriangles; t++) {
    const y0 = posAttr.getY(indices[t * 3]);
    const y1 = posAttr.getY(indices[t * 3 + 1]);
    const y2 = posAttr.getY(indices[t * 3 + 2]);
    const avgY = (y0 + y1 + y2) / 3;

    if (avgY >= 0.54) {
      shortsIndices.push(indices[t * 3], indices[t * 3 + 1], indices[t * 3 + 2]);
    } else {
      bareLegsIndices.push(indices[t * 3], indices[t * 3 + 1], indices[t * 3 + 2]);
    }
  }

  // 1. Shorts Geometry (thighs & waist with slight cuff flare at knee)
  const shortsGeom = origGeom.clone();
  shortsGeom.setIndex(new THREE.BufferAttribute(new Uint16Array(shortsIndices), 1));
  shortsGeom.computeVertexNormals();

  const shortsMaterial = new THREE.MeshStandardMaterial({
    color: '#FFFFFF',
    roughness: 0.75,
    metalness: 0.05,
    side: THREE.DoubleSide
  });

  const shortsMesh = new THREE.SkinnedMesh(shortsGeom, shortsMaterial);
  shortsMesh.name = 'WearWise_Layer_Shorts';
  shortsMesh.castShadow = true;
  shortsMesh.receiveShadow = true;
  shortsMesh.bind(bottomMesh.skeleton, bottomMesh.bindMatrix);

  // 2. Bare Legs Geometry (knees, calves, shins below shorts)
  const bareLegsGeom = origGeom.clone();
  bareLegsGeom.setIndex(new THREE.BufferAttribute(new Uint16Array(bareLegsIndices), 1));
  bareLegsGeom.computeVertexNormals();

  const bareLegsMaterial = new THREE.MeshStandardMaterial({
    color: '#EAC8B0',
    roughness: 0.55,
    metalness: 0.0,
    side: THREE.DoubleSide
  });

  const bareLegsMesh = new THREE.SkinnedMesh(bareLegsGeom, bareLegsMaterial);
  bareLegsMesh.name = 'WearWise_Layer_BareLegs';
  bareLegsMesh.castShadow = true;
  bareLegsMesh.receiveShadow = true;
  bareLegsMesh.bind(bottomMesh.skeleton, bottomMesh.bindMatrix);

  // 3. 3D Cargo Pockets on outer thighs
  const cargoPocketMat = new THREE.MeshStandardMaterial({
    color: '#3B4536',
    roughness: 0.8,
    metalness: 0.1
  });

  const pocketGeom = new THREE.BoxGeometry(0.065, 0.085, 0.045);
  const flapGeom = new THREE.BoxGeometry(0.068, 0.024, 0.048);

  const leftCargoGroup = new THREE.Group();
  leftCargoGroup.name = 'LeftCargoPocket';
  const leftPocket = new THREE.Mesh(pocketGeom, cargoPocketMat);
  const leftFlap = new THREE.Mesh(flapGeom, cargoPocketMat);
  leftFlap.position.set(0, 0.045, 0.002);
  leftCargoGroup.add(leftPocket);
  leftCargoGroup.add(leftFlap);
  leftCargoGroup.position.set(0.12, -0.22, 0.02);
  leftCargoGroup.rotation.z = -0.05;

  const rightCargoGroup = new THREE.Group();
  rightCargoGroup.name = 'RightCargoPocket';
  const rightPocket = new THREE.Mesh(pocketGeom, cargoPocketMat);
  const rightFlap = new THREE.Mesh(flapGeom, cargoPocketMat);
  rightFlap.position.set(0, 0.045, 0.002);
  rightCargoGroup.add(rightPocket);
  rightCargoGroup.add(rightFlap);
  rightCargoGroup.position.set(-0.12, -0.22, 0.02);
  rightCargoGroup.rotation.z = 0.05;

  const parent = bottomMesh.parent || bottomMesh;
  parent.add(shortsMesh);
  parent.add(bareLegsMesh);

  if (bonesMap.LeftUpLeg) bonesMap.LeftUpLeg.add(leftCargoGroup);
  if (bonesMap.RightUpLeg) bonesMap.RightUpLeg.add(rightCargoGroup);

  // Start with default pants visible
  shortsMesh.visible = false;
  bareLegsMesh.visible = false;
  leftCargoGroup.visible = false;
  rightCargoGroup.visible = false;

  const updateGarments = (bottoms: Garment | null | undefined, skinTone: string) => {
    if (!bottoms) {
      bottomMesh.visible = false;
      shortsMesh.visible = false;
      bareLegsMesh.visible = false;
      leftCargoGroup.visible = false;
      rightCargoGroup.visible = false;
      return;
    }

    const isShorts = bottoms.subcategory === 'Shorts' || bottoms.id.includes('shorts');
    const isCargo = bottoms.id.includes('cargo');

    if (isShorts) {
      // 1. SHORTS MODE: Hide full pants, show Shorts + Bare Legs!
      bottomMesh.visible = false;
      shortsMesh.visible = true;
      bareLegsMesh.visible = true;
      leftCargoGroup.visible = false;
      rightCargoGroup.visible = false;

      // Apply shorts fabric texture
      shortsMaterial.map = getGarmentTexture(bottoms.id, bottoms.pbr.color);
      shortsMaterial.roughness = bottoms.pbr.roughness;
      shortsMaterial.metalness = bottoms.pbr.metalness;
      shortsMaterial.color.set(bottoms.pbr.color);
      shortsMaterial.needsUpdate = true;

      // Apply skin tone to bare legs
      bareLegsMaterial.color.set(skinTone);
      bareLegsMaterial.needsUpdate = true;
    } else {
      // 2. FULL PANTS MODE (Jeans, Trousers, Cargos)
      bottomMesh.visible = true;
      shortsMesh.visible = false;
      bareLegsMesh.visible = false;

      const mat = bottomMesh.material as THREE.MeshStandardMaterial;
      if (mat) {
        mat.color.set(bottoms.pbr.color);
        mat.roughness = bottoms.pbr.roughness;
        mat.metalness = bottoms.pbr.metalness;
        mat.map = getGarmentTexture(bottoms.id, bottoms.pbr.color);
        mat.needsUpdate = true;
      }

      // 3. CARGO PANTS: Attach 3D utility flap pockets
      if (isCargo) {
        leftCargoGroup.visible = true;
        rightCargoGroup.visible = true;
        cargoPocketMat.color.set(bottoms.pbr.color);
        cargoPocketMat.roughness = bottoms.pbr.roughness;
        cargoPocketMat.needsUpdate = true;
      } else {
        leftCargoGroup.visible = false;
        rightCargoGroup.visible = false;
      }
    }
  };

  const dispose = () => {
    parent.remove(shortsMesh);
    parent.remove(bareLegsMesh);
    if (bonesMap.LeftUpLeg) bonesMap.LeftUpLeg.remove(leftCargoGroup);
    if (bonesMap.RightUpLeg) bonesMap.RightUpLeg.remove(rightCargoGroup);
    shortsGeom.dispose();
    bareLegsGeom.dispose();
    pocketGeom.dispose();
    flapGeom.dispose();
    shortsMaterial.dispose();
    bareLegsMaterial.dispose();
    cargoPocketMat.dispose();
    bottomMesh.visible = true;
  };

  return {
    updateGarments,
    dispose
  };
}
