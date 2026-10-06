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
    if (!state) state = defaultWorkspace();
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
      const now = Date.now();
      const products: Product[] = opts?.demo ? demoProducts(today(), now).map((p, i) => ({ ...p, id: `p-${i + 1}-${id()}` })) : [];
      write({
        store: {
          id: id(),
          name: input.name.trim(),
          type: input.type,
          area: input.area.trim(),
          managerName: input.managerName.trim(),
          openTime: '07:00',
          closeTime: '23:00',
          deliveryDays: 'Daily (dairy, bakery) · Mon/Thu (packaged)',
          demo: Boolean(opts?.demo),
          createdAt: now,
        },
        settings: { ...DEFAULT_SETTINGS },
        products,
        actions: {},
        events: [
          {
            id: id(),
            productId: 'store',
            productName: input.name.trim(),
            type: 'created',
            delta: 0,
            stockAfter: 0,
            note: opts?.demo ? 'Store created with demo inventory' : 'Store created',
            at: now,
            by: input.managerName.trim(),
          },
        ],
      });
    },
    async updateStore(patch) {
      const w = need();
      w.store = { ...w.store, ...patch };
      write(w);
    },
    async updateSettings(s) {
      const w = need();
      w.settings = { ...s };
      write(w);
    },
    async addProduct(input) {
      const w = need();
      const clean = validateProduct(input);
      const pid = id();
      const now = Date.now();
      const p: Product = {
        id: pid,
        ...clean,
        salesDaily: {},
        trackingSince: today(),
        createdAt: now,
        updatedAt: now,
      };
      w.products = [...w.products, p];
      event(w, { productId: pid, productName: p.name, type: 'created', delta: p.stock, stockAfter: p.stock, note: 'Added to inventory' });
      write(w);
      return pid;
    },
    async updateProduct(pid, input) {
      const w = need();
      const clean = validateProduct(input);
      const prev = product(w, pid);
      const delta = clean.stock - prev.stock;
      const now = Date.now();
      const updated: Product = { ...prev, ...clean, updatedAt: now };
      w.products = w.products.map((x) => (x.id === pid ? updated : x));
      if (delta !== 0) {
        event(w, { productId: pid, productName: updated.name, type: 'edited', delta, stockAfter: updated.stock, note: clean.notes || 'Edited stock' });
      }
      write(w);
    },
    async deleteProduct(pid) {
      const w = need();
      const p = product(w, pid);
      w.products = w.products.filter((x) => x.id !== pid);
      delete w.actions[pid];
      event(w, { productId: pid, productName: p.name, type: 'edited', delta: -p.stock, stockAfter: 0, note: 'Removed from inventory' });
      write(w);
    },
    async recordSale(pid, units, date) {
      const w = need();
      const p = product(w, pid);
      if (units <= 0) throw new ValidationError('Enter 1 or more units.');
      const salesDaily = pruneSales({ ...p.salesDaily, [date]: (p.salesDaily[date] ?? 0) + units }, date);
      const nextStock = Math.max(0, p.stock - units);
      w.products = w.products.map((x) => (x.id === pid ? { ...x, stock: nextStock, salesDaily, updatedAt: Date.now() } : x));
      event(w, { productId: pid, productName: p.name, type: 'sale', delta: -units, stockAfter: nextStock, note: `${units} sold on ${date}` });
      write(w);
    },
    async adjustStock(pid, kind, value, note, expiryDate) {
      const w = need();
      const p = product(w, pid);
      const nextStock = stockAfter(kind, p.stock, value);
      const delta = nextStock - p.stock;
      w.products = w.products.map((x) =>
        x.id === pid
          ? {
              ...x,
              stock: nextStock,
              expiryDate: expiryDate !== undefined ? expiryDate : x.expiryDate,
              updatedAt: Date.now(),
            }
          : x,
      );
      event(w, { productId: pid, productName: p.name, type: kind, delta, stockAfter: nextStock, note: note || `Stock ${kind}` });
      write(w);
    },
    async setAction(r) {
      const w = need();
      product(w, r.productId); // verify exists
      w.actions = { ...w.actions, [r.productId]: { ...r } };
      event(w, {
        productId: r.productId,
        productName: product(w, r.productId).name,
        type: 'action',
        delta: 0,
        stockAfter: product(w, r.productId).stock,
        note: `Action ${r.action} (${r.status}): ${r.note || 'no note'}`,
      });
      write(w);
    },
    async clearAction(pid) {
      const w = need();
      delete w.actions[pid];
      write(w);
    },
    async loadDemo() {
      const w = need();
      const now = Date.now();
      const demoList = demoProducts(today(), now).map((p, i) => ({ ...p, id: `demo-${i + 1}-${id()}` }));
      w.products = demoList;
      w.actions = {};
      w.store.demo = true;
      event(w, { productId: 'store', productName: w.store.name, type: 'created', delta: 0, stockAfter: 0, note: 'Reset with 47 demo products' });
      write(w);
    },
    async clearDemo() {
      const w = need();
      w.products = w.products.filter((p) => !p.demo);
      w.actions = Object.fromEntries(Object.entries(w.actions).filter(([pid]) => w.products.some((p) => p.id === pid)));
      w.store.demo = false;
      write(w);
    },
  };
}

export function resetLocalWorkspace(): void {
  try {
    const def = defaultWorkspace();
    localStorage.setItem(KEY, JSON.stringify(def));
  } catch {
    // ignore
  }
}
