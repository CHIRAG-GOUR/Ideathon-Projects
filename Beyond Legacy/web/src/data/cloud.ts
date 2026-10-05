// Firestore implementation of the Repository.
//   users/{uid}                                  → { storeId, displayName, email }
//   stores/{storeId}                             → store profile (ownerUid)
//   stores/{storeId}/settings/engine             → EngineSettings
//   stores/{storeId}/products/{productId}        → Product (stock, expiry, rolling salesDaily map)
//   stores/{storeId}/sales/{saleId}              → every recorded sale (audit log)
//   stores/{storeId}/inventoryEvents/{eventId}   → stock movements, edits and manager actions
//   stores/{storeId}/recommendations/{productId} → the manager's response to the current recommendation
// Stock changes run in transactions so two devices cannot lose each other's updates.
import { collection, deleteDoc, doc, getDoc, getDocs, limit, onSnapshot, orderBy, query, runTransaction, setDoc, updateDoc, where, writeBatch, type DocumentReference, type Firestore, type Transaction } from 'firebase/firestore';
import { today } from '../engine/dates';
import { demoProducts } from '../engine/demo';
import { DEFAULT_SETTINGS, type ActionRecord, type EngineSettings, type Product, type Store } from '../engine/types';
import { pruneSales, stockAfter, validateProduct, ValidationError, type InventoryEvent, type Repository, type StockKind, type StoreInput, type Workspace } from './repo';

export interface CloudUser { uid: string; email: string; displayName: string }

export function cloudRepository(db: Firestore, user: CloudUser): Repository {
  let storeId: string | null = null;
  const storeRef = () => {
    if (!storeId) throw new ValidationError('Create your store first.');
    return doc(db, 'stores', storeId);
  };
  const sub = (name: string) => collection(storeRef(), name);
  const by = () => user.displayName || user.email;

  function logEvent(t: Transaction, e: Omit<InventoryEvent, 'id' | 'at' | 'by'>) {
    t.set(doc(sub('inventoryEvents')), { ...e, at: Date.now(), by: by() });
  }

  async function withProduct(productId: string, fn: (t: Transaction, p: Product, ref: DocumentReference) => void) {
    const ref = doc(sub('products'), productId);
    await runTransaction(db, async (t) => {
      const snap = await t.get(ref);
      if (!snap.exists()) throw new ValidationError('This product no longer exists.');
      fn(t, { id: snap.id, ...(snap.data() as Omit<Product, 'id'>) }, ref);
    });
  }

  return {
    mode: 'cloud',

    subscribe(onData, onError) {
      const unsubs: (() => void)[] = [];
      const stop = () => unsubs.splice(0).forEach((u) => u());
      const fail = (e: { code?: string; message?: string }) => onError(e.code === 'permission-denied' ? `You do not have access to this store’s data (${e.message ?? 'permission denied'}).` : e.message || 'Could not load your store.');
      const outer = onSnapshot(doc(db, 'users', user.uid), { includeMetadataChanges: true }, (u) => {
        // Wait for the server to confirm a just-created store before listening to it: the security rules check
        // ownership against the stored document, which does not exist server-side until the batch commits.
        if (u.metadata.hasPendingWrites) return;
        const id = u.exists() ? (u.data().storeId as string | undefined) : undefined;
        if (id === storeId && unsubs.length) return;
        stop();
        storeId = id ?? null;
        if (!id) return onData(null);
        const parts: { store?: Store; settings?: EngineSettings; products?: Product[]; actions?: Record<string, ActionRecord>; events?: InventoryEvent[] } = {};
        const emit = () => {
          // a fresh object every time, so memoised analysis downstream recomputes
          if (parts.store && parts.settings && parts.products && parts.actions && parts.events) onData({ ...parts } as Workspace);
        };
        const s = doc(db, 'stores', id);
        unsubs.push(
          onSnapshot(s, (d) => {
            if (!d.exists()) return onData(null);
            parts.store = { id: d.id, ...(d.data() as Omit<Store, 'id'>) };
            emit();
          }, fail),
          onSnapshot(doc(s, 'settings', 'engine'), (d) => {
            parts.settings = { ...DEFAULT_SETTINGS, ...(d.exists() ? (d.data() as Partial<EngineSettings>) : {}) };
            emit();
          }, fail),
          onSnapshot(collection(s, 'products'), (q) => {
            parts.products = q.docs.map((x) => ({ id: x.id, ...(x.data() as Omit<Product, 'id'>) }));
            emit();
          }, fail),
          onSnapshot(collection(s, 'recommendations'), (q) => {
            parts.actions = Object.fromEntries(q.docs.map((x) => [x.id, x.data() as ActionRecord]));
            emit();
          }, fail),
          onSnapshot(query(collection(s, 'inventoryEvents'), orderBy('at', 'desc'), limit(60)), (q) => {
            parts.events = q.docs.map((x) => ({ id: x.id, ...(x.data() as Omit<InventoryEvent, 'id'>) }));
            emit();
          }, fail),
        );
      }, fail);
      return () => {
        outer();
        stop();
      };
    },

    async createStore(input: StoreInput, opts) {
      const ref = doc(collection(db, 'stores'));
      const b = writeBatch(db);
      const store: Omit<Store, 'id'> & { ownerUid: string } = {
        ownerUid: user.uid, name: input.name.trim(), type: input.type, area: input.area.trim(), managerName: input.managerName.trim(),
        openTime: '07:00', closeTime: '23:00', deliveryDays: '', demo: !!opts?.demo, createdAt: Date.now(),
      };
      b.set(ref, store);
      if (opts?.demo) for (const p of demoProducts(today())) b.set(doc(collection(ref, 'products')), p);
      b.set(doc(ref, 'settings', 'engine'), { ...DEFAULT_SETTINGS });
      b.set(doc(db, 'users', user.uid), { storeId: ref.id, displayName: input.managerName.trim(), email: user.email, createdAt: Date.now() });
      await b.commit();
      storeId = ref.id; // usable at once (e.g. loading the demo right after), before the users/{uid} snapshot arrives
    },

    async updateStore(patch) {
      const { id: _id, ...rest } = patch;
      await updateDoc(storeRef(), rest);
    },

    async updateSettings(s) {
      await setDoc(doc(storeRef(), 'settings', 'engine'), s);
    },

    async addProduct(input) {
      const v = validateProduct(input);
      const ref = doc(sub('products'));
      const now = Date.now();
      const b = writeBatch(db);
      b.set(ref, { ...v, salesDaily: {}, trackingSince: today(), createdAt: now, updatedAt: now, demo: false });
      b.set(doc(sub('inventoryEvents')), { productId: ref.id, productName: v.name, type: 'created', delta: v.stock, stockAfter: v.stock, note: 'Product added', at: now, by: by() });
      await b.commit();
      return ref.id;
    },

    async updateProduct(id, input) {
      const v = validateProduct(input);
      await withProduct(id, (t, p, ref) => {
        t.update(ref, { ...v, updatedAt: Date.now() });
        if (v.stock !== p.stock) logEvent(t, { productId: id, productName: v.name, type: 'count', delta: v.stock - p.stock, stockAfter: v.stock, note: 'Stock updated in product details' });
        else logEvent(t, { productId: id, productName: v.name, type: 'edited', delta: 0, stockAfter: v.stock, note: 'Product details edited' });
      });
    },

    async deleteProduct(id) {
      const b = writeBatch(db);
      b.delete(doc(sub('products'), id));
      b.delete(doc(sub('recommendations'), id));
      await b.commit();
    },

    async recordSale(productId, units, date) {
      if (!Number.isInteger(units) || units <= 0) throw new ValidationError('Enter how many units were sold (a whole number above 0).');
      await withProduct(productId, (t, p, ref) => {
        if (units > p.stock) throw new ValidationError(`Only ${p.stock} units are recorded in stock. Update the stock count first if this is wrong.`);
        const salesDaily = pruneSales({ ...p.salesDaily, [date]: (p.salesDaily[date] ?? 0) + units });
        t.update(ref, { stock: p.stock - units, salesDaily, updatedAt: Date.now() });
        t.set(doc(sub('sales')), { productId, units, date, at: Date.now(), by: by() });
        logEvent(t, { productId, productName: p.name, type: 'sale', delta: -units, stockAfter: p.stock - units, note: `Sale recorded for ${date}` });
      });
    },

    async adjustStock(productId, kind: StockKind, value, note, expiryDate) {
      await withProduct(productId, (t, p, ref) => {
        const next = stockAfter(kind, p.stock, value);
        t.update(ref, { stock: next, updatedAt: Date.now(), ...(expiryDate !== undefined ? { expiryDate } : {}) });
        logEvent(t, { productId, productName: p.name, type: kind, delta: next - p.stock, stockAfter: next, note: note || { receive: 'Delivery received', count: 'Stock count', wastage: 'Wastage recorded' }[kind] });
      });
    },

    async setAction(r) {
      const b = writeBatch(db);
      b.set(doc(sub('recommendations'), r.productId), r);
      const p = await getDoc(doc(sub('products'), r.productId));
      b.set(doc(sub('inventoryEvents')), {
        productId: r.productId, productName: p.exists() ? p.data().name : '', type: 'action', delta: 0, stockAfter: r.stockAtAction,
        note: `${r.status[0].toUpperCase()}${r.status.slice(1)}${r.quantity ? ` · ${r.quantity} units` : ''}${r.note ? ` · ${r.note}` : ''}`, at: r.at, by: r.by,
      });
      await b.commit();
    },

    async clearAction(productId) {
      await deleteDoc(doc(sub('recommendations'), productId));
    },

    async loadDemo() {
      await this.clearDemo();
      const products = demoProducts(today());
      const b = writeBatch(db);
      for (const p of products) b.set(doc(sub('products')), p);
      b.update(storeRef(), { demo: true });
      await b.commit();
    },

    async clearDemo() {
      const q = await getDocs(query(sub('products'), where('demo', '==', true)));
      for (let i = 0; i < q.docs.length; i += 200) {
        const b = writeBatch(db);
        for (const d of q.docs.slice(i, i + 200)) {
          b.delete(d.ref);
          b.delete(doc(sub('recommendations'), d.id));
        }
        await b.commit();
      }
      await updateDoc(storeRef(), { demo: false });
    },
  };
}
