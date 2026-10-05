// Procedural textures drawn on canvas (no downloaded assets → nothing to fail loading, tiny bundle).
import * as THREE from 'three';

const cache = new Map<string, THREE.Texture>();
function canvasTex(key: string, w: number, h: number, draw: (g: CanvasRenderingContext2D) => void, repeat?: [number, number]) {
  const hit = cache.get(key);
  if (hit) return hit;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d')!);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  if (repeat) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(repeat[0], repeat[1]);
  }
  cache.set(key, t);
  return t;
}

export const wallTiles = () =>
  canvasTex('wall', 256, 256, (g) => {
    g.fillStyle = '#d9cfbd';
    g.fillRect(0, 0, 256, 256);
    for (let y = 0; y < 4; y++)
      for (let x = 0; x < 4; x++) {
        const v = 236 + ((x * 7 + y * 13) % 9);
        g.fillStyle = `rgb(${v},${v - 6},${v - 16})`;
        g.fillRect(x * 64 + 2, y * 64 + 2, 60, 60);
      }
  }, [8, 3]);

export const floorTiles = () =>
  canvasTex('floor', 256, 256, (g) => {
    g.fillStyle = '#6d6a66';
    g.fillRect(0, 0, 256, 256);
    for (let y = 0; y < 2; y++)
      for (let x = 0; x < 2; x++) {
        const v = 150 + ((x + y) % 2) * 14;
        g.fillStyle = `rgb(${v},${v - 4},${v - 10})`;
        g.fillRect(x * 128 + 3, y * 128 + 3, 122, 122);
      }
    for (let i = 0; i < 900; i++) {
      g.fillStyle = `rgba(0,0,0,${Math.random() * 0.05})`;
      g.fillRect(Math.random() * 256, Math.random() * 256, 2, 2);
    }
  }, [6, 5]);

export const woodFloor = () =>
  canvasTex('wood', 256, 256, (g) => {
    for (let i = 0; i < 8; i++) {
      g.fillStyle = i % 2 ? '#a0714a' : '#94673f';
      g.fillRect(0, i * 32, 256, 31);
    }
    for (let i = 0; i < 400; i++) {
      g.strokeStyle = `rgba(60,35,15,${Math.random() * 0.15})`;
      const y = Math.random() * 256;
      g.beginPath();
      g.moveTo(Math.random() * 256, y);
      g.lineTo(Math.random() * 256, y + Math.random() * 2);
      g.stroke();
    }
  }, [3, 3]);

export const brushedSteel = () =>
  canvasTex('steel', 128, 128, (g) => {
    g.fillStyle = '#b9c0c8';
    g.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 260; i++) {
      g.strokeStyle = `rgba(255,255,255,${Math.random() * 0.18})`;
      const y = Math.random() * 128;
      g.beginPath();
      g.moveTo(0, y);
      g.lineTo(128, y + Math.random() * 1.5);
      g.stroke();
    }
  }, [2, 1]);

export function signTexture(key: string, lines: { text: string; color: string; size: number; weight?: number }[], bg: string, border?: string, w = 512, h = 256) {
  return canvasTex(key, w, h, (g) => {
    g.fillStyle = bg;
    g.fillRect(0, 0, w, h);
    if (border) {
      g.strokeStyle = border;
      g.lineWidth = 14;
      g.strokeRect(10, 10, w - 20, h - 20);
    }
    const total = lines.reduce((a, l) => a + l.size * 1.25, 0);
    let y = (h - total) / 2;
    g.textAlign = 'center';
    g.textBaseline = 'top';
    for (const l of lines) {
      g.fillStyle = l.color;
      g.font = `${l.weight ?? 800} ${l.size}px system-ui, sans-serif`;
      g.fillText(l.text, w / 2, y);
      y += l.size * 1.25;
    }
  });
}
