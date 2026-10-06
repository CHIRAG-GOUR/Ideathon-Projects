// On-device implementation of the Repository (browser storage), used only when no Firebase project is configured
// — the app labels this mode "On this device". Same validation and semantics as the Firestore implementation.
import { today } from '../engine/dates';
import { demoProducts } from '../engine/demo';
import { DEFAULT_SETTINGS, type Product } from '../engine/types';
import { pruneSales, stockAfter, validateProduct, ValidationError, type InventoryEvent, type Repository, type Workspace } from './repo';

const KEY = 'beyondlegacy.workspace.v1';
const id = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);


function defaultWorkspace(): Workspace {
  return {
    store: {
      id: 'local-store',
      name: '7-Express Mart',
      type: 'Convenience Store',
      area: 'Bengaluru Central',
      managerName: 'Store Manager',
      openTime: '07:00',
      closeTime: '23:00',
      deliveryDays: 'Daily (dairy, bakery) · Mon/Thu (packaged)',
      demo: true,
      createdAt: Date.now(),
    },
    settings: { ...DEFAULT_SETTINGS },
    products: demoProducts(today()).map((p, i) => ({ ...p, id: `demo-p-${i + 1}` })),
    actions: {},
    events: [],
  };
}

function read(): Workspace {
  try {
    const s = localStorage.getItem(KEY);
    if (s) return JSON.parse(s) as Workspace;
    const def = defaultWorkspace();
    localStorage.setItem(KEY, JSON.stringify(def));
    return def;
  } catch {
    return defaultWorkspace();
  }
}

export function localRepository(): Repository {
  const listeners = new Set<(w: Workspace | null) => void>();
  let state: Workspace | null = read();
  const write = (w: Workspace | null) => {
    state = w;
    try {
      if (w) localStorage.setItem(KEY, JSON.stringify(w));
      else localStorage.removeItem(KEY);
    } catch {
      throw new ValidationError('This device’s storage is full or blocked, so the change could not be saved.');
    }
    listeners.forEach((l) => l(w ? structuredClone(w) : null));
  };
  const need = () => {
    if (!state) throw new ValidationError('Create your store first.');
    return structuredClone(state);
  };
  const by = () => state?.store.managerName || 'Manager';
  const event = (w: Workspace, e: Omit<InventoryEvent, 'id' | 'at' | 'by'>) => {
    w.events = [{ ...e, id: id(), at: Date.now(), by: by() }, ...w.events].slice(0, 200);
  };
  const product = (w: Workspace, pid: string): Product => {
    const p = w.products.find((x) => x.id === pid);
    if (!p) throw new ValidationError('This product no longer exists.');
    return p;
  };

  return {
    mode: 'local',
    subscribe(onData) {
      listeners.add(onData);
      queueMicrotask(() => onData(state ? structuredClone(state) : null));
      const onStorage = (e: StorageEvent) => {
        if (e.key === KEY) {
          state = read();
          onData(state ? structuredClone(state) : null);
        }
      };
      addEventListener('storage', onStorage);
      return () => {
        listeners.delete(onData);
        removeEventListener('storage', onStorage);
      };
    },
    async createStore(input, opts) {
      write({
        store: { id: 'local', name: input.name.trim(), type: input.type, area: input.area.trim(), managerName: input.managerName.trim(), openTime: '07:00', closeTime: '23:00', deliveryDays: '', demo: false, createdAt: Date.now() },
        settings: { ...DEFAULT_SETTINGS }, products: [], actions: {}, events: [],
      });
      if (opts?.demo) await this.loadDemo();
    },
    async updateStore(patch) {
      const w = need();
      w.store = { ...w.store, ...patch, id: w.store.id };
      write(w);
    },
    async updateSettings(s) {
      const w = need();
      w.settings = s;
      write(w);
    },
    async addProduct(input) {
      const v = validateProduct(input);
      const w = need();
      const now = Date.now();
      const p: Product = { ...v, id: id(), salesDaily: {}, trackingSince: today(), createdAt: now, updatedAt: now, demo: false };
      w.products.push(p);
      event(w, { productId: p.id, productName: p.name, type: 'created', delta: p.stock, stockAfter: p.stock, note: 'Product added' });
      write(w);
      return p.id;
    },
    async updateProduct(pid, input) {
      const v = validateProduct(input);
      const w = need();
      const p = product(w, pid);
      const before = p.stock;
      Object.assign(p, v, { updatedAt: Date.now() });
      event(w, before !== v.stock
        ? { productId: pid, productName: v.name, type: 'count', delta: v.stock - before, stockAfter: v.stock, note: 'Stock updated in product details' }
        : { productId: pid, productName: v.name, type: 'edited', delta: 0, stockAfter: v.stock, note: 'Product details edited' });
      write(w);
    },
    async deleteProduct(pid) {
      const w = need();
      w.products = w.products.filter((p) => p.id !== pid);
      delete w.actions[pid];
      write(w);
    },
    async recordSale(pid, units, date) {
      if (!Number.isInteger(units) || units <= 0) throw new ValidationError('Enter how many units were sold (a whole number above 0).');
      const w = need();
      const p = product(w, pid);
      if (units > p.stock) throw new ValidationError(`Only ${p.stock} units are recorded in stock. Update the stock count first if this is wrong.`);
      p.stock -= units;
      p.salesDaily = pruneSales({ ...p.salesDaily, [date]: (p.salesDaily[date] ?? 0) + units });
      p.updatedAt = Date.now();
      event(w, { productId: pid, productName: p.name, type: 'sale', delta: -units, stockAfter: p.stock, note: `Sale recorded for ${date}` });
      write(w);
    },
    async adjustStock(pid, kind, value, note, expiryDate) {
      const w = need();
      const p = product(w, pid);
      const next = stockAfter(kind, p.stock, value);
      const delta = next - p.stock;
      p.stock = next;
      if (expiryDate !== undefined) p.expiryDate = expiryDate;
      p.updatedAt = Date.now();
      event(w, { productId: pid, productName: p.name, type: kind, delta, stockAfter: next, note: note || { receive: 'Delivery received', count: 'Stock count', wastage: 'Wastage recorded' }[kind] });
      write(w);
    },
    async setAction(r) {
      const w = need();
      w.actions[r.productId] = r;
      event(w, { productId: r.productId, productName: product(w, r.productId).name, type: 'action', delta: 0, stockAfter: r.stockAtAction, note: `${r.status[0].toUpperCase()}${r.status.slice(1)}${r.quantity ? ` · ${r.quantity} units` : ''}${r.note ? ` · ${r.note}` : ''}` });
      write(w);
    },
    async clearAction(pid) {
      const w = need();
      delete w.actions[pid];
      write(w);
    },
    async loadDemo() {
      const w = need();
      const keep = w.products.filter((p) => !p.demo);
      w.products = [...keep, ...demoProducts(today()).map((p) => ({ ...p, id: id() }))];
      w.actions = Object.fromEntries(Object.entries(w.actions).filter(([k]) => keep.some((p) => p.id === k)));
      w.store.demo = true;
      write(w);
    },
    async clearDemo() {
      const w = need();
      w.products = w.products.filter((p) => !p.demo);
      w.actions = Object.fromEntries(Object.entries(w.actions).filter(([k]) => w.products.some((p) => p.id === k)));
      w.store.demo = false;
      write(w);
    },
  };
}

export function resetLocalWorkspace() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* nothing stored */
  }
}
