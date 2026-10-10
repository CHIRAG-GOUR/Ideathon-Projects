import * as THREE from 'three';
import { Garment } from '../types/fashion';

const shirtTextureCache = new Map<string, THREE.CanvasTexture>();
const jacketTextureCache = new Map<string, THREE.CanvasTexture>();

/**
 * Generates high-definition PBR diffuse texture for the inner shirt / top layer.
 * 100% independent from jackets.
 */
export function getShirtTexture(shirt?: Garment | null): THREE.CanvasTexture {
  const shirtColor = shirt?.pbr.color || '#FAF9F5';
  const shirtId = shirt?.id || 'shirt-oxford-white';
  const cacheKey = `shirt_${shirtId}_${shirtColor}`;

  if (shirtTextureCache.has(cacheKey)) {
    return shirtTextureCache.get(cacheKey)!;
  }

  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    const fallback = new THREE.CanvasTexture(canvas);
    return fallback;
  }

  // 1. Base Fabric Fill
  ctx.fillStyle = shirtColor;
  ctx.fillRect(0, 0, 1024, 1024);

  // 2. Texture & Fabric Weave based on shirt type
  if (shirtId.includes('flannel')) {
    // Bold Buffalo Plaid checks (Red & Black grid)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    for (let x = 0; x < 1024; x += 64) {
      ctx.fillRect(x, 0, 32, 1024);
    }
    for (let y = 0; y < 1024; y += 64) {
      ctx.fillRect(0, y, 1024, 32);
    }
  } else if (shirtId.includes('henley')) {
    // Thermal micro-waffle knit texture
    ctx.fillStyle = 'rgba(0, 0, 0, 0.12)';
    for (let x = 0; x < 1024; x += 10) {
      ctx.fillRect(x, 0, 4, 1024);
    }
    for (let y = 0; y < 1024; y += 10) {
      ctx.fillRect(0, y, 1024, 4);
    }
    // Henley button placket (3 buttons)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.fillRect(490, 40, 44, 360);
    for (let by = 90; by <= 330; by += 110) {
      ctx.fillStyle = '#444444';
      ctx.beginPath();
      ctx.arc(512, by, 7, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (shirtId.includes('polo')) {
    // Honeycomb piqué weave
    ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
    for (let x = 0; x < 1024; x += 8) {
      ctx.fillRect(x, 0, 2, 1024);
      ctx.fillRect(0, x, 1024, 2);
    }
    // Polo collar band & 2-button placket
    ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
    ctx.fillRect(492, 0, 40, 280);
    for (let by = 80; by <= 220; by += 120) {
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(512, by, 8, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (shirtId.includes('kurta')) {
    // Saffron raw linen slub + vertical festive weave
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    for (let x = 0; x < 1024; x += 16) {
      ctx.fillRect(x, 0, 3, 1024);
    }
    // Wooden buttons down center
    for (let by = 120; by < 700; by += 120) {
      ctx.fillStyle = '#5C381E';
      ctx.beginPath();
      ctx.arc(512, by, 9, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (shirtId.includes('crewneck')) {
    // Minimalist clean cotton knit
    ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
    for (let y = 0; y < 1024; y += 6) {
      ctx.fillRect(0, y, 1024, 2);
    }
    // Ribbed circular crewneck collar
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.arc(512, 100, 70, 0, Math.PI);
    ctx.stroke();
  } else if (shirtId.includes('vneck')) {
    // Clean heather knit + V-neck band
    ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
    for (let y = 0; y < 1024; y += 6) {
      ctx.fillRect(0, y, 1024, 2);
    }
    // V-neckline rib
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.18)';
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(440, 50);
    ctx.lineTo(512, 220);
    ctx.lineTo(584, 50);
    ctx.stroke();
  } else if (shirtId.includes('denim')) {
    // Indigo denim twill slub with tobacco double stitch
    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    for (let i = 0; i < 1024; i += 6) {
      ctx.fillRect(i, 0, 2, 1024);
    }
    // Pearl snap buttons
    for (let by = 140; by < 850; by += 130) {
      ctx.fillStyle = '#F4F4F6';
      ctx.beginPath();
      ctx.arc(512, by, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#8E949D';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  } else {
    // Classic Button-down / Linen / Oxford
    ctx.fillStyle = 'rgba(0, 0, 0, 0.04)';
    for (let y = 0; y < 1024; y += 8) {
      ctx.fillRect(0, y, 1024, 2);
    }
    // Center button placket
    ctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
    ctx.fillRect(484, 0, 56, 1024);
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.12)';
    ctx.lineWidth = 2;
    ctx.strokeRect(484, 0, 56, 1024);

    // Mother of pearl buttons
    for (let by = 120; by < 880; by += 120) {
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(512, by, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }

  // Collar in top-right UV quadrant
  ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
  ctx.fillRect(740, 0, 284, 260);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.needsUpdate = true;
  shirtTextureCache.set(cacheKey, texture);
  return texture;
}

/**
 * Generates high-definition PBR diffuse texture for the outer jacket layer.
 * 100% independent from inner shirts.
 */
export function getJacketTexture(jacket?: Garment | null): THREE.CanvasTexture {
  const jacketColor = jacket?.pbr.color || '#1A2436';
  const jacketId = jacket?.id || 'jacket-navy-blazer';
  const cacheKey = `jacket_${jacketId}_${jacketColor}`;

  if (jacketTextureCache.has(cacheKey)) {
    return jacketTextureCache.get(cacheKey)!;
  }

  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    const fallback = new THREE.CanvasTexture(canvas);
    return fallback;
  }

  // 1. Base Jacket Fill
  ctx.fillStyle = jacketColor;
  ctx.fillRect(0, 0, 1024, 1024);

  // 2. Specific Outerwear Details
  if (jacketId.includes('leather')) {
    // Supple Lambskin Biker Leather: high-gloss sheen highlights & silver metal hardware
    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.fillRect(0, 0, 512, 1024);

    // Diagonal asymmetric heavy biker zip
    ctx.strokeStyle = '#D8DCE0';
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.moveTo(360, 60);
    ctx.lineTo(540, 1024);
    ctx.stroke();

    // Silver snap buttons & coin pocket
    for (let s = 160; s < 720; s += 160) {
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(340, s, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#7A8089';
      ctx.lineWidth = 2.5;
      ctx.stroke();
    }
  } else if (jacketId.includes('denim')) {
    // Raw Denim Trucker: twill weave, gold contrast double stitching & bronze rivet buttons
    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    for (let i = 0; i < 1024; i += 8) {
      ctx.fillRect(i, 0, 2, 1024);
    }
    // Tobacco double stitching
    ctx.strokeStyle = '#D4A359';
    ctx.lineWidth = 4;
    ctx.setLineDash([8, 6]);
    ctx.strokeRect(180, 140, 664, 760);
    ctx.setLineDash([]);

    // Bronze tack buttons
    for (let by = 160; by < 860; by += 150) {
      ctx.fillStyle = '#C8934E';
      ctx.beginPath();
      ctx.arc(512, by, 11, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (jacketId.includes('bomber')) {
    // Flight Bomber: satin sheen highlights & center brass zip
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.fillRect(100, 100, 420, 820);
    ctx.strokeStyle = '#C9A145';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(512, 60);
    ctx.lineTo(512, 1024);
    ctx.stroke();
  } else if (jacketId.includes('trench')) {
    // Camel Gabardine Trench: double-breasted dual columns of dark horn buttons
    ctx.fillStyle = 'rgba(0, 0, 0, 0.06)';
    for (let y = 0; y < 1024; y += 12) {
      ctx.fillRect(0, y, 1024, 3);
    }
    // Dual columns of horn buttons
    for (let by = 180; by < 850; by += 160) {
      // Left column
      ctx.fillStyle = '#2A1B0E';
      ctx.beginPath();
      ctx.arc(430, by, 12, 0, Math.PI * 2);
      ctx.fill();
      // Right column
      ctx.beginPath();
      ctx.arc(594, by, 12, 0, Math.PI * 2);
      ctx.fill();
    }
  } else {
    // Tailored Navy Blazer: worsted wool weave, deep satin lapels & horn button
    ctx.fillStyle = 'rgba(0, 0, 0, 0.18)';
    ctx.beginPath();
    ctx.moveTo(320, 80);
    ctx.lineTo(512, 600);
    ctx.lineTo(380, 540);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(704, 80);
    ctx.lineTo(512, 600);
    ctx.lineTo(644, 540);
    ctx.closePath();
    ctx.fill();

    // Gold horn button
    ctx.fillStyle = '#D4AF37';
    ctx.beginPath();
    ctx.arc(512, 650, 13, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.needsUpdate = true;
  jacketTextureCache.set(cacheKey, texture);
  return texture;
}

/**
 * Backwards compatibility wrapper for single top mesh fallback
 */
export function getTopGarmentTexture(shirt?: Garment, jacket?: Garment | null): THREE.CanvasTexture {
  if (jacket && !jacket.isNone && jacket.id !== 'jacket-none') {
    return getJacketTexture(jacket);
  }
  return getShirtTexture(shirt);
}

const textureCache = new Map<string, THREE.CanvasTexture>();

/**
 * Generates high-definition PBR diffuse texture for Bottoms and Shoes.
 */
export function getGarmentTexture(garmentId: string, baseColor: string): THREE.CanvasTexture {
  const cacheKey = `${garmentId}_${baseColor}`;
  if (textureCache.has(cacheKey)) {
    return textureCache.get(cacheKey)!;
  }

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    const fallback = new THREE.CanvasTexture(canvas);
    return fallback;
  }

  // Base color fill
  ctx.fillStyle = baseColor;
  ctx.fillRect(0, 0, 512, 512);

  if (garmentId.includes('shorts')) {
    // =========================================================================
    // SHORTS (Relaxed Linen Walk Shorts Pants)
    // =========================================================================
    // Natural linen slub texture
    ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
    for (let i = 0; i < 512; i += 6) {
      ctx.fillRect(i, 0, 2, 512);
    }
    // Elastic drawcord waistband
    ctx.fillStyle = 'rgba(0, 0, 0, 0.12)';
    ctx.fillRect(0, 0, 512, 55);
    // White drawstrings
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(245, 25);
    ctx.lineTo(235, 75);
    ctx.moveTo(267, 25);
    ctx.lineTo(277, 75);
    ctx.stroke();
    // 7-inch rolled hem cuff
    ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
    ctx.fillRect(0, 460, 512, 52);
  } else if (garmentId.includes('jeans') || garmentId.includes('indigo')) {
    // =========================================================================
    // DENIM JEANS
    // =========================================================================
    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    for (let i = 0; i < 512; i += 4) {
      ctx.fillRect(i, 0, 1, 512);
      ctx.fillRect(0, i, 512, 1);
    }
    // Waistband & copper rivets
    ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
    ctx.fillRect(0, 0, 512, 45);
    ctx.strokeStyle = '#D4A359';
    ctx.lineWidth = 2.5;
    ctx.setLineDash([6, 4]);
    ctx.strokeRect(4, 4, 504, 38);
    ctx.setLineDash([]);
    // Front scoops
    ctx.beginPath();
    ctx.arc(100, 45, 70, 0, Math.PI / 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(412, 45, 70, Math.PI / 2, Math.PI);
    ctx.stroke();
  } else if (garmentId.includes('trousers')) {
    // =========================================================================
    // SUIT TROUSERS
    // =========================================================================
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.25)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(150, 50);
    ctx.lineTo(150, 512);
    ctx.moveTo(362, 50);
    ctx.lineTo(362, 512);
    ctx.stroke();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
    ctx.fillRect(0, 0, 512, 45);
  } else if (garmentId.includes('cargo')) {
    // =========================================================================
    // CARGO PANTS
    // =========================================================================
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.08)';
    ctx.lineWidth = 1;
    for (let p = 0; p < 512; p += 16) {
      ctx.beginPath();
      ctx.moveTo(p, 0); ctx.lineTo(p, 512);
      ctx.moveTo(0, p); ctx.lineTo(512, p);
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.fillRect(70, 220, 95, 110);
    ctx.fillRect(347, 220, 95, 110);
  } else if (garmentId.includes('jordan') || garmentId.includes('air-jordan')) {
    // =========================================================================
    // AIR JORDAN RETRO SNEAKERS
    // =========================================================================
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, 512, 256);
    ctx.fillStyle = '#1E1C21';
    ctx.fillRect(0, 256, 256, 256);
    ctx.fillStyle = '#FF8978';
    ctx.fillRect(256, 256, 256, 256);
    ctx.fillStyle = '#FAF8F4';
    ctx.fillRect(0, 460, 512, 52);
  } else if (garmentId.includes('adidas') || garmentId.includes('ultraboost')) {
    // =========================================================================
    // ADIDAS ULTRABOOST
    // =========================================================================
    ctx.fillStyle = '#18171C';
    ctx.fillRect(0, 0, 512, 512);
    // Three metallic stripes
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(180, 200); ctx.lineTo(150, 360);
    ctx.moveTo(220, 200); ctx.lineTo(190, 360);
    ctx.moveTo(260, 200); ctx.lineTo(230, 360);
    ctx.stroke();
    // White boost midsole
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 450, 512, 62);
  } else if (garmentId.includes('oxford')) {
    // =========================================================================
    // FORMAL OXFORD DRESS SHOES
    // =========================================================================
    ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
    ctx.fillRect(0, 200, 512, 80);
    ctx.fillStyle = '#26170E';
    ctx.fillRect(0, 460, 512, 52);
  } else if (garmentId.includes('boot') || garmentId.includes('chelsea')) {
    // =========================================================================
    // SUEDE CHELSEA BOOTS
    // =========================================================================
    ctx.fillStyle = 'rgba(0, 0, 0, 0.12)';
    for (let x = 0; x < 512; x += 3) {
      ctx.fillRect(x, 0, 1, 512);
    }
    // Elastic side gore
    ctx.fillStyle = '#1E1C21';
    ctx.fillRect(210, 80, 92, 160);
    // Crepe rubber sole
    ctx.fillStyle = '#4A3B2C';
    ctx.fillRect(0, 460, 512, 52);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.needsUpdate = true;

  textureCache.set(cacheKey, texture);
  return texture;
}
