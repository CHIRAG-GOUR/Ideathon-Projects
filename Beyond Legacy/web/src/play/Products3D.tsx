// Product models for Shelf Rush: recognisable packs built from a few shared shapes — a milk carton, a bread loaf,
// a paneer block, a sweets box, an oil bottle, an atta bag, a namkeen pouch, a biscuit roll — plus a carton and a bag.
// Geometries and materials are shared module-wide so hundreds of products on the shelves stay cheap to draw.
import * as THREE from 'three';

const G = {
  box: new THREE.BoxGeometry(1, 1, 1),
  cyl: new THREE.CylinderGeometry(0.5, 0.5, 1, 16),
  cylLo: new THREE.CylinderGeometry(0.5, 0.5, 1, 10),
  half: new THREE.CylinderGeometry(0.5, 0.5, 1, 14, 1, false, 0, Math.PI),
  sphere: new THREE.SphereGeometry(0.5, 14, 10),
  prism: new THREE.CylinderGeometry(0.5, 0.5, 1, 3),
};
const mats = new Map<string, THREE.MeshStandardMaterial>();
const M = (c: string, rough = 0.6) => {
  const k = `${c}|${rough}`;
  if (!mats.has(k)) mats.set(k, new THREE.MeshStandardMaterial({ color: c, roughness: rough }));
  return mats.get(k)!;
};
type P = [number, number, number];
const part = (g: THREE.BufferGeometry, c: string, pos: P, scale: P, rot: P = [0, 0, 0], rough?: number, key?: string) => (
  <mesh key={key ?? `${pos}${scale}${c}`} geometry={g} material={M(c, rough)} position={pos} scale={scale} rotation={rot} />
);

/** Height of each product (for stacking on a shelf). */
export const PRODUCT_H: Record<string, number> = { milk: 0.3, bread: 0.2, paneer: 0.09, sweets: 0.1, oil: 0.36, atta: 0.34, namkeen: 0.26, biscuits: 0.1 };
/** Footprint width used to lay products out along a shelf. */
export const PRODUCT_W: Record<string, number> = { milk: 0.18, bread: 0.3, paneer: 0.24, sweets: 0.28, oil: 0.15, atta: 0.26, namkeen: 0.2, biscuits: 0.1 };

/** One product, standing on y = 0. `expiring` adds an orange date sticker. */
export function ProductModel({ id, expiring }: { id: string; expiring?: boolean }) {
  const sticker = expiring ? part(G.box, '#E8772E', [0, PRODUCT_H[id] * 0.55, (id === 'oil' ? 0.08 : 0.07) + 0.012], [0.07, 0.05, 0.01], [0, 0, 0], 0.4, 'stk') : null;
  switch (id) {
    case 'milk': // gable-top carton with a blue band
      return <group>
        {part(G.box, '#F7F8FA', [0, 0.12, 0], [0.16, 0.24, 0.12])}
        {part(G.box, '#2F6FB0', [0, 0.1, 0], [0.162, 0.07, 0.122])}
        {part(G.prism, '#EEF1F4', [0, 0.27, 0], [0.13, 0.16, 0.11], [Math.PI / 2, 0, Math.PI / 2])}
        {sticker}
      </group>;
    case 'bread': // loaf: square base, domed top, printed wrapper band
      return <group>
        {part(G.box, '#C98A4B', [0, 0.07, 0], [0.28, 0.14, 0.17])}
        {part(G.half, '#B87634', [0, 0.14, 0], [0.17, 0.28, 0.17], [0, 0, Math.PI / 2])}
        {part(G.box, '#F5ECD8', [0, 0.08, 0], [0.12, 0.145, 0.175], [0, 0, 0], 0.9)}
        {sticker}
      </group>;
    case 'paneer': // white block in a clear pack with a green label
      return <group>
        {part(G.box, '#FBF7EC', [0, 0.04, 0], [0.22, 0.08, 0.16], [0, 0, 0], 0.4)}
        {part(G.box, '#3E8E6A', [0, 0.04, 0], [0.08, 0.082, 0.162])}
        {sticker}
      </group>;
    case 'sweets': // gold gift box with a red ribbon
      return <group>
        {part(G.box, '#E9B949', [0, 0.045, 0], [0.26, 0.09, 0.2], [0, 0, 0], 0.35)}
        {part(G.box, '#C0392B', [0, 0.046, 0], [0.04, 0.092, 0.202])}
        {part(G.box, '#C0392B', [0, 0.046, 0], [0.262, 0.092, 0.04])}
      </group>;
    case 'oil': // bottle: body, shoulder, neck, red cap, label
      return <group>
        {part(G.cyl, '#F2C94C', [0, 0.12, 0], [0.13, 0.24, 0.13], [0, 0, 0], 0.15)}
        {part(G.sphere, '#F2C94C', [0, 0.245, 0], [0.13, 0.08, 0.13], [0, 0, 0], 0.15)}
        {part(G.cyl, '#F5D86A', [0, 0.3, 0], [0.05, 0.06, 0.05], [0, 0, 0], 0.15)}
        {part(G.cyl, '#C0392B', [0, 0.345, 0], [0.06, 0.035, 0.06])}
        {part(G.cyl, '#0E6B47', [0, 0.12, 0], [0.135, 0.09, 0.135])}
      </group>;
    case 'atta': // tall paper bag with a red label and a folded top
      return <group>
        {part(G.box, '#EAD9B5', [0, 0.15, 0], [0.24, 0.3, 0.12], [0, 0, 0], 0.9)}
        {part(G.box, '#C0392B', [0, 0.16, 0], [0.242, 0.1, 0.122])}
        {part(G.box, '#DCC8A0', [0, 0.315, 0], [0.24, 0.035, 0.08], [0, 0, 0], 0.9)}
      </group>;
    case 'namkeen': // puffy pouch with a yellow stripe
      return <group>
        {part(G.sphere, '#D7372B', [0, 0.13, 0], [0.19, 0.26, 0.08], [0, 0, 0], 0.35)}
        {part(G.box, '#F5B82E', [0, 0.13, 0.03], [0.15, 0.06, 0.03])}
        {part(G.box, '#B02A20', [0, 0.255, 0], [0.12, 0.02, 0.03])}
      </group>;
    case 'biscuits': // biscuit roll lying down: blue wrapper, brown ends
      return <group>
        {part(G.cylLo, '#2F6FB0', [0, 0.05, 0], [0.1, 0.24, 0.1], [0, 0, Math.PI / 2], 0.35)}
        {part(G.cylLo, '#7B4A2A', [0.125, 0.05, 0], [0.095, 0.01, 0.095], [0, 0, Math.PI / 2])}
        {part(G.cylLo, '#7B4A2A', [-0.125, 0.05, 0], [0.095, 0.01, 0.095], [0, 0, Math.PI / 2])}
        {part(G.box, '#F5ECD8', [0, 0.05, 0.05], [0.08, 0.03, 0.01])}
      </group>;
    default:
      return part(G.box, '#999', [0, 0.1, 0], [0.2, 0.2, 0.2]);
  }
}

/** A delivery carton (what the worker carries). */
export function Carton() {
  return <group>
    {part(G.box, '#C8995B', [0, 0, 0], [0.42, 0.3, 0.32], [0, 0, 0], 0.9)}
    {part(G.box, '#8C6435', [0, 0.151, 0], [0.43, 0.006, 0.06])}
    {part(G.box, '#F5ECD8', [0.12, 0.02, 0.161], [0.12, 0.08, 0.004])}
  </group>;
}

/** A brown paper shopping bag (after paying). */
export function PaperBag() {
  return <group>
    {part(G.box, '#B98A55', [0, -0.12, 0], [0.2, 0.24, 0.12], [0, 0, 0], 0.95)}
    {part(G.box, '#0E6B47', [0, -0.1, 0.061], [0.08, 0.06, 0.003])}
  </group>;
}
