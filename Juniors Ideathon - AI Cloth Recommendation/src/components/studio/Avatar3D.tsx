import React, { useRef, useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { useFashionStore } from '../../store/useFashionStore';
import { MOODS } from '../../data/moods';
import { getTopGarmentTexture, getGarmentTexture } from '../../services/textureGenerator';
import { createGlassesMesh } from './Glasses3D';
import { createWatchMesh, WatchColorVariant } from './Watch3D';
import { createTopGarmentLayers, TopGarmentLayersController } from './TopGarmentLayers';
import { createBottomGarmentLayers, BottomGarmentLayersController } from './BottomGarmentLayers';
import { FASHION_POSES, FashionPoseId } from './ModelPoses';

useGLTF.preload('/models/character.glb');

interface BoneRefMap {
  Head?: THREE.Bone;
  Neck?: THREE.Bone;
  Spine?: THREE.Bone;
  Spine1?: THREE.Bone;
  Spine2?: THREE.Bone;
  Hips?: THREE.Bone;
  LeftShoulder?: THREE.Bone;
  RightShoulder?: THREE.Bone;
  LeftArm?: THREE.Bone;
  RightArm?: THREE.Bone;
  LeftForeArm?: THREE.Bone;
  RightForeArm?: THREE.Bone;
  LeftHand?: THREE.Bone;
  RightHand?: THREE.Bone;
  LeftUpLeg?: THREE.Bone;
  RightUpLeg?: THREE.Bone;
}

export function Avatar3D() {
  const groupRef = useRef<THREE.Group>(null);
  const { currentMood, equipped, avatarCustomization, currentPose, isPoseAutoFlow, setPose } = useFashionStore();

  const { scene } = useGLTF('/models/character.glb');
  const character = scene;

  // Track outfit change time for interactive "outfit inspection" animation
  const lastChangeTimeRef = useRef<number>(0);
  const prevEquippedKeyRef = useRef<string>('');

  const outfitFingerprint = `${equipped.shirt?.id || 'none'}_${equipped.jacket?.id || 'none'}_${equipped.bottoms?.id || 'none'}_${equipped.shoes?.id || 'none'}_${currentMood}`;

  useEffect(() => {
    character.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const mesh = obj as THREE.SkinnedMesh;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      }
      if (obj.name === 'Wolf3D_Headwear') {
        obj.visible = false;
      }
    });
  }, [character]);

  // Find bones & store their original rest rotations
  const bonesMap = useMemo<BoneRefMap>(() => {
    const map: BoneRefMap = {};
    character.traverse((child) => {
      if ((child as THREE.Bone).isBone) {
        const name = child.name;
        if (!child.userData.restEuler) {
          child.userData.restEuler = child.rotation.clone();
        }

        if (name === 'Head') map.Head = child as THREE.Bone;
        if (name === 'Neck') map.Neck = child as THREE.Bone;
        if (name === 'Spine') map.Spine = child as THREE.Bone;
        if (name === 'Spine1') map.Spine1 = child as THREE.Bone;
        if (name === 'Spine2') map.Spine2 = child as THREE.Bone;
        if (name === 'Hips') map.Hips = child as THREE.Bone;
        if (name === 'LeftShoulder') map.LeftShoulder = child as THREE.Bone;
        if (name === 'RightShoulder') map.RightShoulder = child as THREE.Bone;
        if (name === 'LeftArm') map.LeftArm = child as THREE.Bone;
        if (name === 'RightArm') map.RightArm = child as THREE.Bone;
        if (name === 'LeftForeArm') map.LeftForeArm = child as THREE.Bone;
        if (name === 'RightForeArm') map.RightForeArm = child as THREE.Bone;
        if (name === 'LeftHand') map.LeftHand = child as THREE.Bone;
        if (name === 'RightHand') map.RightHand = child as THREE.Bone;
        if (name === 'LeftUpLeg') map.LeftUpLeg = child as THREE.Bone;
        if (name === 'RightUpLeg') map.RightUpLeg = child as THREE.Bone;
      }
    });
    return map;
  }, [character]);

  // Morph meshes for facial smile & mouth expressions
  const morphMeshes = useMemo(() => {
    const meshes: THREE.Mesh[] = [];
    character.traverse((child) => {
      if ((child as THREE.Mesh).isMesh && (child as THREE.Mesh).morphTargetInfluences) {
        meshes.push(child as THREE.Mesh);
      }
    });
    return meshes;
  }, [character]);

  // Mesh references
  const topMesh = useMemo(() => character.getObjectByName('Wolf3D_Outfit_Top') as THREE.SkinnedMesh | null, [character]);
  const bottomMesh = useMemo(() => character.getObjectByName('Wolf3D_Outfit_Bottom') as THREE.SkinnedMesh | null, [character]);
  const shoesMesh = useMemo(() => character.getObjectByName('Wolf3D_Outfit_Footwear') as THREE.SkinnedMesh | null, [character]);
  const bodyMesh = useMemo(() => character.getObjectByName('Wolf3D_Body') as THREE.SkinnedMesh | null, [character]);
  const headMesh = useMemo(() => character.getObjectByName('Wolf3D_Head') as THREE.SkinnedMesh | null, [character]);
  const beardMesh = useMemo(() => character.getObjectByName('Wolf3D_Beard') as THREE.SkinnedMesh | null, [character]);
  const headwearMesh = useMemo(() => character.getObjectByName('Wolf3D_Headwear') as THREE.SkinnedMesh | null, [character]);

  // Two-Layer Clothing Controller (Base Shirt + Outer Jacket)
  const topLayersRef = useRef<TopGarmentLayersController | null>(null);

  useEffect(() => {
    if (topMesh) {
      const controller = createTopGarmentLayers(topMesh);
      topLayersRef.current = controller;
      return () => {
        controller?.dispose();
        topLayersRef.current = null;
      };
    }
  }, [topMesh]);

  // Lower Body Garment Controller (Jeans, Trousers, Cargos with 3D pockets, Shorts with bare skin legs)
  const bottomLayersRef = useRef<BottomGarmentLayersController | null>(null);

  useEffect(() => {
    if (bottomMesh) {
      const controller = createBottomGarmentLayers(bottomMesh, {
        LeftUpLeg: bonesMap.LeftUpLeg,
        RightUpLeg: bonesMap.RightUpLeg
      });
      bottomLayersRef.current = controller;
      return () => {
        controller?.dispose();
        bottomLayersRef.current = null;
      };
    }
  }, [bottomMesh, bonesMap.LeftUpLeg, bonesMap.RightUpLeg]);

  // Determine watch variant (silver, gold, black, rose gold)
  const watchVariant = useMemo<WatchColorVariant>(() => {
    const watchItem = equipped.watch || (equipped.accessories?.subcategory === 'Watch' ? equipped.accessories : null);
    if (!watchItem) return 'gold';
    if (watchItem.id.includes('silver')) return 'silver';
    if (watchItem.id.includes('black')) return 'black';
    if (watchItem.id.includes('rosegold')) return 'rosegold';
    return 'gold';
  }, [equipped.watch, equipped.accessories]);

  // Watch accessory instance
  const watchInstance = useMemo(() => {
    const watch = createWatchMesh(watchVariant);
    watch.scale.set(1.15, 1.15, 1.15);
    watch.position.set(0.015, 0.22, 0.02);
    watch.rotation.set(0, Math.PI / 2, Math.PI / 2);
    return watch;
  }, [watchVariant]);

  // Dual-lens designer eyewear instance
  const sunglassesInstance = useMemo(() => {
    if (!equipped.glasses || equipped.glasses.isNone || equipped.glasses.id === 'acc-glasses-none') {
      return null;
    }
    const glasses = createGlassesMesh(equipped.glasses);
    // Positioned cleanly on nose bridge ridge across pupils without clipping into eye sockets
    glasses.position.set(0, 0.088, 0.107);
    glasses.rotation.set(0, 0, 0); // perfectly level across eyes
    glasses.scale.set(1.0, 1.0, 1.0);
    return glasses;
  }, [equipped.glasses]);

  // Attach / Detach accessories & headwear on armature bones
  useEffect(() => {
    // 1. WATCH
    const leftForeArm = bonesMap.LeftForeArm || bonesMap.LeftHand;
    const hasWatch = !!equipped.watch || (equipped.accessories?.subcategory === 'Watch');
    if (leftForeArm && watchInstance) {
      if (hasWatch) {
        leftForeArm.add(watchInstance);
      } else {
        leftForeArm.remove(watchInstance);
      }
    }

    // 2. GLASSES (designer eyewear)
    const headBone = bonesMap.Head;
    const hasGlasses = !!sunglassesInstance && !!equipped.glasses && !equipped.glasses.isNone && equipped.glasses.id !== 'acc-glasses-none';
    if (headBone) {
      // Clean up any previously attached glasses
      const existingGlasses = headBone.getObjectByName('DesignerEyewear') || headBone.getObjectByName('DesignerSunglasses');
      if (existingGlasses) {
        headBone.remove(existingGlasses);
      }
      if (hasGlasses && sunglassesInstance) {
        headBone.add(sunglassesInstance);
      }
    }

    // 3. HEADWEAR (Classic Felt Fedora Hat or None)
    const headwearItem = equipped.headwear;
    const isNoHat = !headwearItem || headwearItem.isNone || headwearItem.id === 'acc-headwear-none' || (!headwearItem && avatarCustomization.headwearType === 'none');
    const isFedora = !isNoHat && (headwearItem?.id.includes('fedora') || avatarCustomization.headwearType === 'fedora');

    // Handle character.glb's native headwear mesh (Fedora)
    if (headwearMesh) {
      if (isFedora && !isNoHat) {
        headwearMesh.visible = true;
        if (headwearMesh.material && (headwearMesh.material as THREE.MeshStandardMaterial)) {
          (headwearMesh.material as THREE.MeshStandardMaterial).color.set(headwearItem?.hexColor || '#3B4536');
        }
      } else {
        headwearMesh.visible = false;
      }
    }

    return () => {
      if (leftForeArm && watchInstance) leftForeArm.remove(watchInstance);
      if (headBone && sunglassesInstance) headBone.remove(sunglassesInstance);
    };
  }, [
    bonesMap, 
    watchInstance, 
    sunglassesInstance,
    equipped.watch,
    equipped.glasses,
    equipped.headwear,
    equipped.accessories,
    avatarCustomization.headwearType,
    headwearMesh
  ]);

  // Trigger inspection motion on outfit change
  useEffect(() => {
    if (prevEquippedKeyRef.current !== outfitFingerprint) {
      prevEquippedKeyRef.current = outfitFingerprint;
      lastChangeTimeRef.current = performance.now() / 1000;
    }
  }, [outfitFingerprint]);

  // Apply customizable skin, beard
  useEffect(() => {
    if (bodyMesh && (bodyMesh.material as THREE.MeshStandardMaterial)) {
      const mat = bodyMesh.material as THREE.MeshStandardMaterial;
      mat.color.set(avatarCustomization.skinTone);
      mat.roughness = 0.55;
    }
    if (headMesh && (headMesh.material as THREE.MeshStandardMaterial)) {
      const mat = headMesh.material as THREE.MeshStandardMaterial;
      mat.color.set(avatarCustomization.skinTone);
      mat.roughness = 0.55;
    }
    if (beardMesh) {
      beardMesh.visible = avatarCustomization.beardVisible;
      if (beardMesh.material as THREE.MeshStandardMaterial) {
        (beardMesh.material as THREE.MeshStandardMaterial).color.set(avatarCustomization.beardColor);
      }
    }
  }, [avatarCustomization, bodyMesh, headMesh, beardMesh]);

  // Apply PBR Materials & Layered Textures to equipped garments
  useEffect(() => {
    // 1. UPPER GARMENTS (True 2-Layered Architecture: Base Shirt + Outer Jacket)
    if (topLayersRef.current) {
      const shirt = equipped.shirt || equipped.tops;
      const jacket = equipped.jacket;
      topLayersRef.current.updateGarments(shirt, jacket);
    }

    // 2. BOTTOM GARMENT (Jeans, Trousers, Cargos with 3D pockets, Shorts with bare legs)
    if (bottomLayersRef.current) {
      bottomLayersRef.current.updateGarments(equipped.bottoms, avatarCustomization.skinTone);
    } else if (bottomMesh) {
      if (equipped.bottoms) {
        bottomMesh.visible = true;
        const mat = bottomMesh.material as THREE.MeshStandardMaterial;
        if (mat) {
          mat.color.set(equipped.bottoms.pbr.color);
          mat.roughness = equipped.bottoms.pbr.roughness;
          mat.metalness = equipped.bottoms.pbr.metalness;
          mat.map = getGarmentTexture(equipped.bottoms.id, equipped.bottoms.pbr.color);
          mat.needsUpdate = true;
        }
      } else {
        bottomMesh.visible = false;
      }
    }

    // 3. SHOES (Jordans, Adidas, Minimalist, Oxfords, Chelsea Boots)
    if (shoesMesh) {
      if (equipped.shoes) {
        shoesMesh.visible = true;
        const mat = shoesMesh.material as THREE.MeshStandardMaterial;
        if (mat) {
          mat.color.set(equipped.shoes.pbr.color);
          mat.roughness = equipped.shoes.pbr.roughness;
          mat.metalness = equipped.shoes.pbr.metalness;
          mat.map = getGarmentTexture(equipped.shoes.id, equipped.shoes.pbr.color);
          mat.needsUpdate = true;
        }
      } else {
        shoesMesh.visible = false;
      }
    }
  }, [equipped, avatarCustomization.skinTone, topMesh, bottomMesh, shoesMesh]);

  // Track auto-flow pose timing
  const lastPoseCycleTimeRef = useRef<number>(0);
  const poseOrder = useMemo<FashionPoseId[]>(() => ['runway-stride', 'hand-on-hip', 'lapel-check', 'casual-lean', 'gq-turn'], []);

  // Frame animation loop: 5 high-fashion model poses + reactive outfit inspection
  useFrame((state, delta) => {
    const config = MOODS[currentMood] || MOODS.chill;
    const time = state.clock.getElapsedTime();

    // Auto-advance model pose every 6.0 seconds if auto-flow is active
    if (isPoseAutoFlow) {
      if (lastPoseCycleTimeRef.current === 0) {
        lastPoseCycleTimeRef.current = time;
      } else if (time - lastPoseCycleTimeRef.current > 6.0) {
        lastPoseCycleTimeRef.current = time;
        const currentIndex = poseOrder.indexOf(currentPose);
        const nextIndex = (currentIndex + 1) % poseOrder.length;
        setPose(poseOrder[nextIndex]);
      }
    }

    // Active pose definition from FASHION_POSES
    const activePose = FASHION_POSES[currentPose] || FASHION_POSES['runway-stride'];

    // Check if in "checking outfit" inspection phase (active for 2.4s after outfit change)
    const elapsedSinceChange = time - lastChangeTimeRef.current;
    const isInspecting = elapsedSinceChange < 2.4;

    let inspectHeadX = 0;
    let inspectHeadY = 0;
    let inspectSpineY = 0;
    let inspectLeftForeArmX = 0;
    let inspectRightForeArmX = 0;

    if (isInspecting) {
      // Phase 1 (0 to 1.2s): Look down at chest/collar, raise hands to inspect fabric
      if (elapsedSinceChange < 1.2) {
        const tProgress = elapsedSinceChange / 1.2;
        const curve = Math.sin(tProgress * Math.PI);
        inspectHeadX = curve * 0.38; // head looks down at chest
        inspectHeadY = curve * 0.12;
        inspectSpineY = curve * 0.06;
        inspectLeftForeArmX = curve * 0.42; // hand lifts to touch collar/sleeve
        inspectRightForeArmX = curve * 0.38;
      } 
      // Phase 2 (1.2s to 2.4s): Look down towards waist/pants, subtle body twist
      else {
        const tProgress = (elapsedSinceChange - 1.2) / 1.2;
        const curve = Math.sin(tProgress * Math.PI);
        inspectHeadX = curve * 0.42; // looks down at bottoms/shoes
        inspectHeadY = curve * -0.10;
        inspectSpineY = curve * -0.06;
      }
    }

    // Morph Target Interpolation for Smile & Mouth
    const targetSmile = isInspecting ? 0.35 : config.expression.smile;
    const targetOpen = config.expression.open;
    const morphLerp = 1 - Math.exp(-delta * 8);

    morphMeshes.forEach((mesh) => {
      if (mesh.morphTargetInfluences && mesh.morphTargetDictionary) {
        const smileIdx = mesh.morphTargetDictionary['mouthSmile'];
        const openIdx = mesh.morphTargetDictionary['mouthOpen'];

        if (smileIdx !== undefined) {
          mesh.morphTargetInfluences[smileIdx] = THREE.MathUtils.lerp(
            mesh.morphTargetInfluences[smileIdx],
            targetSmile,
            morphLerp
          );
        }
        if (openIdx !== undefined) {
          mesh.morphTargetInfluences[openIdx] = THREE.MathUtils.lerp(
            mesh.morphTargetInfluences[openIdx],
            targetOpen,
            morphLerp
          );
        }
      }
    });

    // Subtle natural breathing rhythm & editorial model weight shift
    const breath = Math.sin(time * 2.0) * 0.014;
    const modelWeightShift = Math.sin(time * 1.1) * 0.012;

    // Smooth Skeletal Bone Rotation Lerping: blend smoothly into target fashion pose
    const boneLerp = 1 - Math.exp(-delta * 4.8);

    const applyOffset = (
      bone?: THREE.Bone,
      targetDelta?: [number, number, number],
      extraX = 0,
      extraY = 0,
      extraZ = 0
    ) => {
      if (!bone) return;
      const rest = (bone.userData.restEuler as THREE.Euler) || new THREE.Euler(0, 0, 0);
      const target = targetDelta || [0, 0, 0];

      const targetX = rest.x + target[0] + extraX;
      const targetY = rest.y + target[1] + extraY;
      const targetZ = rest.z + target[2] + extraZ;

      bone.rotation.x = THREE.MathUtils.lerp(bone.rotation.x, targetX, boneLerp);
      bone.rotation.y = THREE.MathUtils.lerp(bone.rotation.y, targetY, boneLerp);
      bone.rotation.z = THREE.MathUtils.lerp(bone.rotation.z, targetZ, boneLerp);
    };

    // Apply the 5 Distinct Editorial Model Poses
    applyOffset(bonesMap.Head, activePose.head, inspectHeadX, inspectHeadY + modelWeightShift * 0.5, 0);
    applyOffset(bonesMap.Neck, activePose.neck, inspectHeadX * 0.4, inspectHeadY * 0.4);
    applyOffset(bonesMap.Spine, activePose.spine, breath, inspectSpineY + modelWeightShift);
    applyOffset(bonesMap.Spine1, activePose.spine1, breath * 0.8, 0);
    applyOffset(bonesMap.Hips, activePose.hips, 0, modelWeightShift * 0.5, 0);

    applyOffset(bonesMap.LeftArm, activePose.leftArm, 0, 0, breath * 0.5);
    applyOffset(bonesMap.RightArm, activePose.rightArm, 0, 0, -breath * 0.5);
    applyOffset(bonesMap.LeftForeArm, activePose.leftForeArm, inspectLeftForeArmX);
    applyOffset(bonesMap.RightForeArm, activePose.rightForeArm, inspectRightForeArmX);

    applyOffset(bonesMap.LeftUpLeg, activePose.leftUpLeg);
    applyOffset(bonesMap.RightUpLeg, activePose.rightUpLeg);
  });

  return (
    // Feet resting firmly at y = 0.00 on pedestal, facing forward toward camera
    <group ref={groupRef} position={[0, 0, 0]} rotation={[0, 0, 0]}>
      <primitive object={character} />
    </group>
  );
}
