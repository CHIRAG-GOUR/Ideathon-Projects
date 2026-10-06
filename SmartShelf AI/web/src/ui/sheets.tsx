// Every data-entry flow lives here, opened from anywhere through useSheets(): add/edit product, record sale,
// stock movements, completing a recommendation, and the reasoning panel.
import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { fmt1, type Analysis } from '../engine/analyze';
import { addDays, formatDate, today } from '../engine/dates';
import { CATEGORIES, type Category, type Product } from '../engine/types';
import { friendlyError, stockAfter, validateProduct, type ProductInput, type StockKind } from '../data/repo';
import { useWorkspace } from '../state/session';
import { isCritical, Reasoning } from './decision';
import { ProductArt } from '../art/ProductArt';
import { AnimatePresence, motion } from 'framer-motion';
import { ActionBadge, Button, ErrorNote, Field, Input, Segmented, Select, Sheet, useToast } from './kit';
import { IconCheck } from './icons';

type Open =
  | { kind: 'product'; product?: Product }
  | { kind: 'sale'; productId?: string }
  | { kind: 'stock'; productId: string; mode: StockKind }
  | { kind: 'act'; analysis: Analysis }
  | { kind: 'why'; analysis: Analysis }
  | null;

interface Sheets {
  addProduct(): void;
  editProduct(p: Product): void;
  recordSale(productId?: string): void;
  stock(productId: string, mode: StockKind): void;
  act(a: Analysis): void;
  why(a: Analysis): void;
}

const Ctx = createContext<Sheets | null>(null);
export const useSheets = () => {
  const s = useContext(Ctx);
  if (!s) throw new Error('useSheets outside SheetsProvider');
  return s;
};

export function SheetsProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState<Open>(null);
  const api = useMemo<Sheets>(() => ({
    addProduct: () => setOpen({ kind: 'product' }),
    editProduct: (product) => setOpen({ kind: 'product', product }),
    recordSale: (productId) => setOpen({ kind: 'sale', productId }),
    stock: (productId, mode) => setOpen({ kind: 'stock', productId, mode }),
    act: (analysis) => setOpen({ kind: 'act', analysis }),
    why: (analysis) => setOpen({ kind: 'why', analysis }),
  }), []);
  const close = () => setOpen(null);
  return (
    <Ctx.Provider value={api}>
      {children}
      <ProductSheet open={open?.kind === 'product'} product={open?.kind === 'product' ? open.product : undefined} onClose={close} key={open?.kind === 'product' ? open.product?.id ?? 'new' : 'p'} />
      <SaleSheet open={open?.kind === 'sale'} productId={open?.kind === 'sale' ? open.productId : undefined} onClose={close} key={open?.kind === 'sale' ? `s${open.productId}` : 's'} />
      {open?.kind === 'stock' && <StockSheet productId={open.productId} initial={open.mode} onClose={close} />}
      {open?.kind === 'act' && <ActSheet a={open.analysis} onClose={close} />}
      <Sheet open={open?.kind === 'why'} onClose={close} title={open?.kind === 'why' ? open.analysis.product.name : ''} sub="Why this recommendation?" wide
        header={open?.kind === 'why' ? <ProductArt product={open.analysis.product} size={72} className="-ml-1 mb-1" /> : undefined}>
        {open?.kind === 'why' && (
          <div className="space-y-4">
            <ActionBadge action={open.analysis.recommendation.action} size="lg" critical={isCritical(open.analysis)} />
            <Reasoning a={open.analysis} />
            {!open.analysis.handled && (
              <Button tone="primary" className="w-full" onClick={() => setOpen({ kind: 'act', analysis: open.analysis })}>Act on this recommendation</Button>
            )}
          </div>
        )}
      </Sheet>
    </Ctx.Provider>
  );
}

// ---------------------------------------------------------------- add / edit product

const blank: ProductInput = { name: '', category: 'Beverages', stock: 0, unitPrice: 0, expiryDate: null, safetyStock: 0, caseSize: 1, supplier: '', notes: '', declaredDailySales: 0 };

function ProductSheet({ open, product, onClose }: { open: boolean; product?: Product; onClose: () => void }) {
  const { repo } = useWorkspace();
  const toast = useToast();
  const nav = useNavigate();
  const [f, setF] = useState<Record<keyof ProductInput, string>>(() => {
    const p = product ?? blank;
    return { name: p.name, category: p.category, stock: product ? String(p.stock) : '', unitPrice: product ? String(p.unitPrice) : '', expiryDate: p.expiryDate ?? '', safetyStock: product ? String(p.safetyStock) : '', caseSize: String(p.caseSize), supplier: p.supplier, notes: p.notes, declaredDailySales: product ? String(p.declaredDailySales) : '' };
  });
  const [perishable, setPerishable] = useState(!!product?.expiryDate || !product);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const set = (k: keyof ProductInput) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF((x) => ({ ...x, [k]: e.target.value }));
  const n = (v: string) => (v.trim() === '' ? NaN : Number(v));

  async function save() {
    setErr(null);
    try {
      const input = validateProduct({
        name: f.name, category: f.category as Category, stock: n(f.stock), unitPrice: n(f.unitPrice), expiryDate: perishable ? (f.expiryDate || null) : null,
        safetyStock: f.safetyStock === '' ? 0 : n(f.safetyStock), caseSize: n(f.caseSize), supplier: f.supplier, notes: f.notes, declaredDailySales: f.declaredDailySales === '' ? 0 : n(f.declaredDailySales),
      });
      if (perishable && !input.expiryDate) throw new Error('Enter the expiry date, or switch off “Has an expiry date”.');
      setBusy(true);
      if (product) {
        await repo.updateProduct(product.id, input);
        toast('Product updated — recommendations recalculated');
      } else {
        const id = await repo.addProduct(input);
        toast('Product added — recommendations updated');
        nav(`/products/${id}`);
      }
      onClose();
    } catch (e) {
      setErr(friendlyError(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title={product ? 'Edit product' : 'Add product'} sub={product ? product.name : 'Stock, sales and expiry turn into a recommendation as soon as you save.'}
      footer={<div className="flex gap-2"><Button onClick={onClose} className="flex-1">Cancel</Button><Button tone="primary" busy={busy} onClick={save} className="flex-[2]">{product ? 'Save changes' : 'Add product'}</Button></div>}>
      <form className="space-y-4" onSubmit={(e) => (e.preventDefault(), save())}>
        <Field label="Product name" htmlFor="pf-name"><Input id="pf-name" value={f.name} onChange={set('name')} placeholder="e.g. Cold Coffee 250ml" maxLength={80} autoComplete="off" /></Field>
        <Field label="Category" htmlFor="pf-cat"><Select id="pf-cat" value={f.category} onChange={set('category')}>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</Select></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Current stock" htmlFor="pf-stock" hint="Units on hand"><Input id="pf-stock" inputMode="numeric" value={f.stock} onChange={set('stock')} placeholder="0" /></Field>
          <Field label="Daily sales" htmlFor="pf-sales" hint="Your estimate, units/day"><Input id="pf-sales" inputMode="decimal" value={f.declaredDailySales} onChange={set('declaredDailySales')} placeholder="0" /></Field>
          <Field label="Unit price (₹)" htmlFor="pf-price"><Input id="pf-price" inputMode="decimal" value={f.unitPrice} onChange={set('unitPrice')} placeholder="0" /></Field>
          <Field label="Minimum safe stock" htmlFor="pf-safety" hint="Never go below"><Input id="pf-safety" inputMode="numeric" value={f.safetyStock} onChange={set('safetyStock')} placeholder="0" /></Field>
          <Field label="Order in multiples of" htmlFor="pf-case" hint="Case / pack size"><Input id="pf-case" inputMode="numeric" value={f.caseSize} onChange={set('caseSize')} /></Field>
          <Field label="Supplier / source" htmlFor="pf-sup"><Input id="pf-sup" value={f.supplier} onChange={set('supplier')} placeholder="Optional" /></Field>
        </div>
        <div className="rounded-xl border border-line p-3">
          <label className="flex items-center justify-between gap-3 text-[14px] font-semibold text-ink-2">
            Has an expiry date
            <input type="checkbox" checked={perishable} onChange={(e) => setPerishable(e.target.checked)} className="h-5 w-5 accent-[rgb(var(--smart-green))]" />
          </label>
          {perishable && <div className="mt-3"><Field label="Earliest expiry of the stock on hand" htmlFor="pf-exp"><Input id="pf-exp" type="date" value={f.expiryDate} onChange={set('expiryDate')} /></Field></div>}
        </div>
        <Field label="Notes" htmlFor="pf-notes"><textarea id="pf-notes" value={f.notes} onChange={set('notes')} rows={2} maxLength={500} className="w-full rounded-xl border border-line-strong px-3 py-2 text-[15px] focus:border-green focus:outline-none focus:ring-4 focus:ring-green/15" placeholder="Optional" /></Field>
        {err && <ErrorNote>{err}</ErrorNote>}
        <button type="submit" hidden />
      </form>
    </Sheet>
  );
}

// ---------------------------------------------------------------- record sale

function SaleSheet({ open, productId, onClose }: { open: boolean; productId?: string; onClose: () => void }) {
  const { repo, workspace } = useWorkspace();
  const toast = useToast();
  const products = [...workspace.products].sort((a, b) => a.name.localeCompare(b.name));
  const [pid, setPid] = useState(productId ?? '');
  const [qty, setQty] = useState('');
  const [date, setDate] = useState(today());
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const p = products.find((x) => x.id === pid);
  const units = Number(qty);
  async function save() {
    setErr(null);
    if (!p) return setErr('Choose a product.');
    if (date > today()) return setErr('Sales cannot be recorded for a future date.');
    setBusy(true);
    try {
      await repo.recordSale(p.id, units, date);
      toast(`Recorded ${units} sold · ${p.name}`);
      onClose();
    } catch (e) {
      setErr(friendlyError(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Sheet open={open} onClose={onClose} title="Record sale" sub="Sales update stock and the demand forecast immediately."
      footer={<Button tone="primary" className="w-full" busy={busy} onClick={save}>Record sale</Button>}>
      <form className="space-y-4" onSubmit={(e) => (e.preventDefault(), save())}>
        <Field label="Product" htmlFor="sale-p">
          <Select id="sale-p" value={pid} onChange={(e) => setPid(e.target.value)}>
            <option value="">Choose a product…</option>
            {products.map((x) => <option key={x.id} value={x.id}>{x.name} ({x.stock} in stock)</option>)}
          </Select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Units sold" htmlFor="sale-q"><Input id="sale-q" inputMode="numeric" value={qty} onChange={(e) => setQty(e.target.value.replace(/[^\d]/g, ''))} placeholder="0" /></Field>
          <Field label="Date" htmlFor="sale-d"><Input id="sale-d" type="date" value={date} max={today()} min={addDays(today(), -30)} onChange={(e) => setDate(e.target.value)} /></Field>
        </div>
        {p && units > 0 && <p className="rounded-xl bg-canvas px-3 py-2 text-[13.5px] text-ink-2">Stock after sale: <b className="tabular-nums">{Math.max(0, p.stock - units)}</b> units</p>}
        {err && <ErrorNote>{err}</ErrorNote>}
        <button type="submit" hidden />
      </form>
    </Sheet>
  );
}

// ---------------------------------------------------------------- stock movements

function StockSheet({ productId, initial, onClose }: { productId: string; initial: StockKind; onClose: () => void }) {
  const { repo, workspace } = useWorkspace();
  const toast = useToast();
  const p = workspace.products.find((x) => x.id === productId);
  const ordered = workspace.actions[productId]?.status === 'ordered' ? workspace.actions[productId] : null;
  const [mode, setMode] = useState<StockKind>(initial);
  const [qty, setQty] = useState(initial === 'receive' && ordered?.quantity ? String(ordered.quantity) : initial === 'count' && p ? String(p.stock) : '');
  const [expiry, setExpiry] = useState(p?.expiryDate ?? '');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  if (!p) return null;
  let preview: string | null = null;
  try {
    if (qty !== '') preview = String(stockAfter(mode, p.stock, Number(qty)));
  } catch (e) {
    preview = null;
  }
  async function save() {
    setErr(null);
    setBusy(true);
    try {
      const newExpiry = mode === 'receive' && p!.expiryDate !== null ? (expiry || null) : undefined;
      await repo.adjustStock(p!.id, mode, qty === '' ? NaN : Number(qty), note.trim(), newExpiry);
      toast(mode === 'receive' ? `Delivery received · ${p!.name}` : mode === 'wastage' ? `Wastage recorded · ${p!.name}` : `Stock count saved · ${p!.name}`);
      onClose();
    } catch (e) {
      setErr(friendlyError(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Sheet open onClose={onClose} title="Update stock" sub={`${p.name} · ${p.stock} units now`}
      footer={<Button tone="primary" className="w-full" busy={busy} onClick={save}>Save</Button>}>
      <form className="space-y-4" onSubmit={(e) => (e.preventDefault(), save())}>
        <Segmented label="Stock movement" value={mode} onChange={(m) => { setMode(m); setQty(m === 'count' ? String(p.stock) : m === 'receive' && ordered?.quantity ? String(ordered.quantity) : ''); }}
          options={[['receive', 'Delivery'], ['count', 'Count'], ['wastage', 'Wastage']]} />
        <Field label={mode === 'receive' ? 'Units received' : mode === 'count' ? 'Units counted on the shelf' : 'Units wasted / damaged'} htmlFor="st-q"
          hint={mode === 'receive' && ordered ? `You marked ${ordered.quantity} units as ordered on ${new Date(ordered.at).toLocaleDateString()}.` : undefined}>
          <Input id="st-q" inputMode="numeric" value={qty} onChange={(e) => setQty(e.target.value.replace(/[^\d]/g, ''))} placeholder="0" />
        </Field>
        {mode === 'receive' && p.expiryDate !== null && (
          <Field label="Expiry of the stock now on hand" htmlFor="st-e" hint={`Currently ${formatDate(p.expiryDate)}. Keep the earliest date if older stock remains.`}><Input id="st-e" type="date" value={expiry} onChange={(e) => setExpiry(e.target.value)} /></Field>
        )}
        <Field label="Note" htmlFor="st-n"><Input id="st-n" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional" maxLength={120} /></Field>
        {preview !== null && <p className="rounded-xl bg-canvas px-3 py-2 text-[13.5px] text-ink-2">Stock after: <b className="tabular-nums">{preview}</b> units</p>}
        {err && <ErrorNote>{err}</ErrorNote>}
        <button type="submit" hidden />
      </form>
    </Sheet>
  );
}

// ---------------------------------------------------------------- completing a recommendation

function ActSheet({ a, onClose }: { a: Analysis; onClose: () => void }) {
  const { repo, workspace, user } = useWorkspace();
  const toast = useToast();
  const r = a.recommendation;
  const [qty, setQty] = useState(r.quantity ? String(r.quantity) : '');
  const [note, setNote] = useState('');
  const [writeOff, setWriteOff] = useState(true);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const copy = {
    RESTOCK: { title: 'Mark ordered', body: 'Records that you placed this order with your supplier. SmartShelf does not contact suppliers. The move stays handled until the delivery is received.', button: 'Mark ordered', done: 'Ordered', status: 'ordered' as const },
    SELL_SOON: { title: 'Mark priority', body: 'Adds this product to today’s priority-selling list — for example front-of-counter placement. The move stays handled until a new batch arrives.', button: 'Mark priority', done: 'Prioritised', status: 'prioritized' as const },
    HOLD: { title: 'Acknowledge', body: 'Confirms you will not reorder for now. SmartShelf will raise it again if the situation changes.', button: 'Acknowledge', done: 'Acknowledged', status: 'acknowledged' as const },
    REMOVE: { title: 'Mark removed', body: 'Confirms the expired stock is off the shelf.', button: 'Mark removed', done: 'Removed', status: 'removed' as const },
  }[r.action];
  async function save() {
    setErr(null);
    const q = r.action === 'RESTOCK' ? Number(qty) : null;
    if (r.action === 'RESTOCK' && (!Number.isInteger(q) || q! <= 0)) return setErr('Enter the quantity you ordered.');
    setBusy(true);
    try {
      if (r.action === 'REMOVE' && writeOff && a.product.stock > 0) await repo.adjustStock(a.product.id, 'wastage', a.product.stock, 'Expired stock removed');
      await repo.setAction({
        productId: a.product.id, action: r.action, status: copy.status, quantity: q, at: Date.now(), by: user?.name || workspace.store.managerName,
        stockAtAction: r.action === 'REMOVE' && writeOff ? 0 : a.product.stock, expiryAtAction: a.product.expiryDate, note: note.trim(),
      });
      setDone(true);
      toast(`${copy.done} · ${a.product.name}`);
      setTimeout(onClose, 750); // let the button settle into its completed state first
    } catch (e) {
      setErr(friendlyError(e));
      setBusy(false);
    }
  }
  return (
    <Sheet open onClose={onClose} title={copy.title} sub={a.product.name} header={<ProductArt product={a.product} size={64} className="-ml-1 mb-1" />}
      footer={
        <Button tone="primary" className="w-full overflow-hidden" busy={busy && !done} disabled={done} onClick={save}>
          <AnimatePresence mode="wait" initial={false}>
            <motion.span key={done ? 'done' : 'todo'} initial={{ y: 14, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -14, opacity: 0 }} transition={{ duration: 0.18 }} className="inline-flex items-center gap-2">
              {done ? <><IconCheck size={18} />{copy.done}</> : copy.button}
            </motion.span>
          </AnimatePresence>
        </Button>
      }>
      <div className="space-y-4">
        <div className="flex items-center gap-2"><ActionBadge action={r.action} /><span className="text-[14px] font-semibold text-ink-2">{r.headline}</span></div>
        <p className="text-[14px] text-ink-2">{copy.body}</p>
        {r.action === 'RESTOCK' && (
          <Field label="Quantity ordered" htmlFor="act-q" hint={`Suggested ${r.quantity} units (${fmt1(a.demand.daily)}/day × ${workspace.settings.orderCoverageDays} days + safety ${a.product.safetyStock} − stock ${a.product.stock}, in cases of ${a.product.caseSize})`}>
            <Input id="act-q" inputMode="numeric" value={qty} onChange={(e) => setQty(e.target.value.replace(/[^\d]/g, ''))} />
          </Field>
        )}
        {r.action === 'REMOVE' && a.product.stock > 0 && (
          <label className="flex items-center gap-3 rounded-xl border border-line p-3 text-[14px] text-ink-2">
            <input type="checkbox" checked={writeOff} onChange={(e) => setWriteOff(e.target.checked)} className="h-5 w-5 accent-[rgb(var(--smart-green))]" />
            Record {a.product.stock} units as wastage (sets stock to 0)
          </label>
        )}
        <Field label="Note" htmlFor="act-n"><Input id="act-n" value={note} onChange={(e) => setNote(e.target.value)} placeholder={r.action === 'RESTOCK' ? 'e.g. Supplier, delivery day' : r.action === 'SELL_SOON' ? 'e.g. Moved to counter display' : 'Optional'} maxLength={120} /></Field>
        {err && <ErrorNote>{err}</ErrorNote>}
      </div>
    </Sheet>
  );
}
