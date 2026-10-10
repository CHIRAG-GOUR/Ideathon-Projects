import * as THREE from 'three';
import { Garment } from '../../types/fashion';
import { getShirtTexture, getJacketTexture } from '../../services/textureGenerator';

export interface TopGarmentLayersController {
  shirtMesh: THREE.SkinnedMesh;
  jacketMesh: THREE.SkinnedMesh;
  updateGarments: (shirt: Garment | null | undefined, jacket: Garment | null | undefined) => void;
  dispose: () => void;
}

/**
 * Creates completely independent, non-interleaved BufferGeometry.
 * Guarantees that buffer updates and vertex mutations operate directly on pure Float32 arrays.
 */
function createIndependentGeometry(orig: THREE.BufferGeometry): THREE.BufferGeometry {
  const geom = new THREE.BufferGeometry();
  const posAttr = orig.attributes.position;
  const count = posAttr.count;

  // 1. Position
  const posArr = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    posArr[i * 3] = posAttr.getX(i);
    posArr[i * 3 + 1] = posAttr.getY(i);
    posArr[i * 3 + 2] = posAttr.getZ(i);
  }
  geom.setAttribute('position', new THREE.BufferAttribute(posArr, 3));

  // 2. Normal
  const normAttr = orig.attributes.normal;
  if (normAttr) {
    const normArr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      normArr[i * 3] = normAttr.getX(i);
      normArr[i * 3 + 1] = normAttr.getY(i);
      normArr[i * 3 + 2] = normAttr.getZ(i);
    }
    geom.setAttribute('normal', new THREE.BufferAttribute(normArr, 3));
  }

  // 3. UV
  const uvAttr = orig.attributes.uv;
  if (uvAttr) {
    const uvArr = new Float32Array(count * 2);
    for (let i = 0; i < count; i++) {
      uvArr[i * 2] = uvAttr.getX(i);
      uvArr[i * 2 + 1] = uvAttr.getY(i);
    }
    geom.setAttribute('uv', new THREE.BufferAttribute(uvArr, 2));
  }

  // 4. SkinIndex
  const skinIndexAttr = orig.attributes.skinIndex;
  if (skinIndexAttr) {
    const skinIndexArr = new Float32Array(count * 4);
    for (let i = 0; i < count; i++) {
      skinIndexArr[i * 4] = skinIndexAttr.getX(i);
      skinIndexArr[i * 4 + 1] = skinIndexAttr.getY(i);
      skinIndexArr[i * 4 + 2] = skinIndexAttr.getZ(i);
      skinIndexArr[i * 4 + 3] = skinIndexAttr.getW(i);
    }
    geom.setAttribute('skinIndex', new THREE.BufferAttribute(skinIndexArr, 4));
  }

  // 5. SkinWeight
  const skinWeightAttr = orig.attributes.skinWeight;
  if (skinWeightAttr) {
    const skinWeightArr = new Float32Array(count * 4);
    for (let i = 0; i < count; i++) {
      skinWeightArr[i * 4] = skinWeightAttr.getX(i);
      skinWeightArr[i * 4 + 1] = skinWeightAttr.getY(i);
      skinWeightArr[i * 4 + 2] = skinWeightAttr.getZ(i);
      skinWeightArr[i * 4 + 3] = skinWeightAttr.getW(i);
    }
    geom.setAttribute('skinWeight', new THREE.BufferAttribute(skinWeightArr, 4));
  }

  return geom;
}

/**
 * High-precision two-layer upper garment architecture:
 * 1. Base Shirt / T-Shirt / Polo / Kurta Layer (shirtMesh):
 *    - Complete, organic upper-body garment covering chest, shoulders, and sleeves.
 *    - Smooth, anatomically correct curved chest without vest buttons, bowties, flower brooches, or coattails.
 *    - Tucked neatly at Y = 1.01 (8.5 cm inside trouser waistband), eliminating all waist holes.
 *    - Kurta tunic silhouette extending down to Y = 0.95.
 * 2. Outer Jacket Layer (jacketMesh):
 *    - Completely removed (visible = false) when 'No Jacket' is selected.
 *    - Natural jacket length down to Y = 0.95 (covering belt & upper trousers, not cut short).
 *    - Fitted over the base shirt with +4mm outward normal clearance to prevent any clipping.
 */
export function createTopGarmentLayers(topMesh: THREE.SkinnedMesh): TopGarmentLayersController | null {
  const origGeom = topMesh.geometry;
  if (!origGeom || !origGeom.index) return null;

  const posAttr = origGeom.attributes.position;
  const indexAttr = origGeom.index;
  const numVertices = posAttr.count;
  const numIndices = indexAttr.count;
  const numTriangles = numIndices / 3;

  // Build vertex adjacency to detect geometric components (islands)
  const vertToTris: number[][] = Array.from({ length: numVertices }, () => []);
  const indices = indexAttr.array;

  for (let t = 0; t < numTriangles; t++) {
    vertToTris[indices[t * 3]].push(t);
    vertToTris[indices[t * 3 + 1]].push(t);
    vertToTris[indices[t * 3 + 2]].push(t);
  }

  const visited = new Uint8Array(numTriangles);
  const components: number[][] = [];

  for (let t = 0; t < numTriangles; t++) {
    if (visited[t]) continue;
    const comp: number[] = [];
    const queue: number[] = [t];
    visited[t] = 1;
    while (queue.length > 0) {
      const curr = queue.pop()!;
      comp.push(curr);
      for (let c = 0; c < 3; c++) {
        const v = indices[curr * 3 + c];
        for (const neighbor of vertToTris[v]) {
          if (!visited[neighbor]) {
            visited[neighbor] = 1;
            queue.push(neighbor);
          }
        }
      }
    }
    components.push(comp);
  }

  // Sort largest to smallest
  components.sort((a, b) => b.length - a.length);

  // Identified component groups from mesh topology
  const bowtieIslands = new Set([4, 11, 22, 31, 34, 37, 39, 40]);
  const flowerIslands = new Set([7, 23, 24, 25]);
  const vestButtonIslands = new Set([13, 14, 15]);
  const chestOpeningIslands = new Set([20, 21]); // Inner shirt chest behind open lapels

  const triToIsland = new Int32Array(numTriangles);
  components.forEach((c, idx) => {
    for (const t of c) triToIsland[t] = idx;
  });

  // 1. Build Shirt Triangles
  const shirtIndices: number[] = [];
  const kurtaIndices: number[] = [];

  for (let t = 0; t < numTriangles; t++) {
    const isl = triToIsland[t];
    const y0 = posAttr.getY(indices[t * 3]);
    const y1 = posAttr.getY(indices[t * 3 + 1]);
    const y2 = posAttr.getY(indices[t * 3 + 2]);
    const minY = Math.min(y0, y1, y2);

    const isBowtie = bowtieIslands.has(isl);
    const isFlower = flowerIslands.has(isl);
    const isVestButton = vestButtonIslands.has(isl);

    // Strictly exclude bowtie, flower brooch, and vest buttons for all modern shirts
    if (isBowtie || isFlower || isVestButton) continue;

    // Coattails: cut back coattails below y = 1.01 so shirt tucks neatly inside pants waistband (1.089)
    const isTailBelowWaist = (isl === 0 || isl === 1) && minY < 1.01;
    const isTailBelowKurta = (isl === 0 || isl === 1) && minY < 0.95;

    if (!isTailBelowWaist) {
      shirtIndices.push(indices[t * 3], indices[t * 3 + 1], indices[t * 3 + 2]);
    }
    if (!isTailBelowKurta) {
      kurtaIndices.push(indices[t * 3], indices[t * 3 + 1], indices[t * 3 + 2]);
    }
  }

  // 2. Build Jacket Triangles (Proper jacket length down to y = 0.95, long for trench)
  const waistJacketIndices: number[] = [];
  const longJacketIndices: number[] = [];

  for (let t = 0; t < numTriangles; t++) {
    const isl = triToIsland[t];
    const y0 = posAttr.getY(indices[t * 3]);
    const y1 = posAttr.getY(indices[t * 3 + 1]);
    const y2 = posAttr.getY(indices[t * 3 + 2]);
    const minY = Math.min(y0, y1, y2);

    const isBowtie = bowtieIslands.has(isl);
    const isFlower = flowerIslands.has(isl);
    const isChestOpening = chestOpeningIslands.has(isl);
    // Cut coattails below y = 0.95 so modern jacket covers belt & upper trousers naturally
    const isCoattailBelowBelt = (isl === 0 || isl === 1) && minY < 0.95;

    if (!isBowtie && !isChestOpening && !isFlower) {
      longJacketIndices.push(indices[t * 3], indices[t * 3 + 1], indices[t * 3 + 2]);
      if (!isCoattailBelowBelt) {
        waistJacketIndices.push(indices[t * 3], indices[t * 3 + 1], indices[t * 3 + 2]);
      }
    }
  }

  // Create Independent Shirt Geometry & Buffers
  const shirtGeom = createIndependentGeometry(origGeom);
  const shirtIndexAttr = new THREE.BufferAttribute(new Uint16Array(shirtIndices), 1);
  const kurtaIndexAttr = new THREE.BufferAttribute(new Uint16Array(kurtaIndices), 1);
  shirtGeom.setIndex(shirtIndexAttr);

  // Gently ease any lapel flap step (vertices at z > 0.142) into the smooth natural chest curve
  // (Prevents harsh stepped edges while strictly preserving natural human chest curvature!)
  const sPosAttr = shirtGeom.attributes.position;
  if (sPosAttr) {
    for (let i = 0; i < sPosAttr.count; i++) {
      const x = sPosAttr.getX(i);
      const y = sPosAttr.getY(i);
      const z = sPosAttr.getZ(i);
      if (y > 1.12 && y < 1.54 && Math.abs(x) < 0.16 && z > 0.142) {
        sPosAttr.setZ(i, 0.140);
      }
    }
    sPosAttr.needsUpdate = true;
  }
  shirtGeom.computeVertexNormals();

  // Create Independent Jacket Geometry with outward offset (+4mm along vertex normals)
  const jacketGeom = createIndependentGeometry(origGeom);
  const waistJacketIndexAttr = new THREE.BufferAttribute(new Uint16Array(waistJacketIndices), 1);
  const longJacketIndexAttr = new THREE.BufferAttribute(new Uint16Array(longJacketIndices), 1);
  jacketGeom.setIndex(waistJacketIndexAttr);

  const jPosAttr = jacketGeom.attributes.position;
  const jNormAttr = jacketGeom.attributes.normal;
  if (jPosAttr && jNormAttr) {
    for (let i = 0; i < jPosAttr.count; i++) {
      const nx = jNormAttr.getX(i);
      const ny = jNormAttr.getY(i);
      const nz = jNormAttr.getZ(i);
      jPosAttr.setXYZ(
        i,
        jPosAttr.getX(i) + nx * 0.004,
        jPosAttr.getY(i) + ny * 0.004,
        jPosAttr.getZ(i) + nz * 0.004
      );
    }
    jPosAttr.needsUpdate = true;
  }
  jacketGeom.computeVertexNormals();

  // Create Independent PBR Materials
  const shirtMaterial = new THREE.MeshStandardMaterial({
    color: '#FFFFFF',
    roughness: 0.65,
    metalness: 0.05,
    side: THREE.DoubleSide
  });

  const jacketMaterial = new THREE.MeshStandardMaterial({
    color: '#FFFFFF',
    roughness: 0.45,
    metalness: 0.1,
    side: THREE.DoubleSide
  });

  // Create Skinned Meshes and bind to armature skeleton
  const shirtMesh = new THREE.SkinnedMesh(shirtGeom, shirtMaterial);
  shirtMesh.name = 'WearWise_Layer_Shirt';
  shirtMesh.castShadow = true;
  shirtMesh.receiveShadow = true;
  shirtMesh.bind(topMesh.skeleton, topMesh.bindMatrix);

  const jacketMesh = new THREE.SkinnedMesh(jacketGeom, jacketMaterial);
  jacketMesh.name = 'WearWise_Layer_Jacket';
  jacketMesh.castShadow = true;
  jacketMesh.receiveShadow = true;
  jacketMesh.bind(topMesh.skeleton, topMesh.bindMatrix);

  // Hide the original combined top mesh
  topMesh.visible = false;

  // Attach layered meshes to model
  const parent = topMesh.parent || topMesh;
  parent.add(shirtMesh);
  parent.add(jacketMesh);

  const updateGarments = (
    shirt: Garment | null | undefined, 
    jacket: Garment | null | undefined
  ) => {
    // 1. UPDATE INNER SHIRT LAYER (BASE UPPER-BODY GARMENT)
    shirtMesh.visible = true;
    shirtMaterial.map = getShirtTexture(shirt);
    shirtMaterial.roughness = shirt?.pbr.roughness ?? 0.65;
    shirtMaterial.metalness = shirt?.pbr.metalness ?? 0.05;
    shirtMaterial.color.set('#FFFFFF');
    shirtMaterial.needsUpdate = true;

    const shirtId = shirt?.id || 'shirt-oxford-white';
    const isKurta = shirtId.includes('kurta');

    if (isKurta) {
      shirtGeom.setIndex(kurtaIndexAttr);
    } else {
      shirtGeom.setIndex(shirtIndexAttr);
    }

    // 2. UPDATE OUTER JACKET LAYER
    const hasJacket = !!jacket && !jacket.isNone && jacket.id !== 'jacket-none';
    if (hasJacket) {
      jacketMesh.visible = true;
      jacketMaterial.map = getJacketTexture(jacket);
      jacketMaterial.roughness = jacket.pbr.roughness ?? 0.45;
      jacketMaterial.metalness = jacket.pbr.metalness ?? 0.1;
      jacketMaterial.color.set('#FFFFFF');
      jacketMaterial.needsUpdate = true;

      // Select natural waist length vs long silhouette based on jacket style
      if (jacket.id.includes('trench')) {
        jacketGeom.setIndex(longJacketIndexAttr);
      } else {
        jacketGeom.setIndex(waistJacketIndexAttr);
      }

      // Proportional scaling for outerwear volume
      if (jacket.pbr.scaleOffset) {
        jacketMesh.scale.set(
          jacket.pbr.scaleOffset[0],
          jacket.pbr.scaleOffset[1],
          jacket.pbr.scaleOffset[2]
        );
      } else {
        jacketMesh.scale.set(1, 1, 1);
      }
    } else {
      // "NO JACKET": outer jacket layer is cleanly removed!
      jacketMesh.visible = false;
    }
  };

  const dispose = () => {
    parent.remove(shirtMesh);
    parent.remove(jacketMesh);
    shirtGeom.dispose();
    jacketGeom.dispose();
    shirtMaterial.dispose();
    jacketMaterial.dispose();
    topMesh.visible = true;
  };

  return {
    shirtMesh,
    jacketMesh,
    updateGarments,
    dispose
  };
}
