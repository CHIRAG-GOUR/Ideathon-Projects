'use client';
import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';
import { addDoc, collection, deleteDoc, doc, orderBy, query, setDoc } from 'firebase/firestore';
import type { EmergencyLocation } from '@shared/types';
import { fmtCoord } from '@shared/geo';
import { useList } from '@core/data';
import { db } from '@core/firebase';
import { currentFix } from '@core/native';
import { Header, Page, useApp } from '@/ctx';
import { Btn, Card, Chip, Field, Sheet, Spinner, Toggle, inputCls, cx } from '@/ui/kit';
import { Icon } from '@/ui/icons';

type Category = 'harassment' | 'following' | 'unsafe_place' | 'verbal' | 'online' | 'other';
interface Incident { id: string; title: string; text: string; category: Category; happenedAt: string; place: string | null; location: EmergencyLocation | null; createdAt: string }
const CATS: [Category, string][] = [['harassment', 'Harassment'], ['following', 'Being followed'], ['unsafe_place', 'Unsafe place'], ['verbal', 'Verbal abuse'], ['online', 'Online'], ['other', 'Other']];
const catName = (c: Category) => CATS.find((x) => x[0] === c)?.[1] ?? c;
const localInput = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);

/** Incident Journal: the user's own dated record. Text only, private, never sent anywhere automatically. */
export function Journal() {
  const { uid, demo } = useApp();
  const items = useList<Incident>(uid ? `users/${uid}/incidents` : null, (c) => query(c, orderBy('happenedAt', 'desc')), [uid]);
  const [edit, setEdit] = useState<Incident | 'new' | null>(null);
  const [open, setOpen] = useState<string | null>(null);

  return (
    <>
      <Header title="Incident Journal" sub="A private, dated record — useful if you ever need to report something" back right={<Btn disabled={demo || !uid} onClick={() => setEdit('new')}><Icon name="plus" size={18} />New</Btn>} />
      <Page>
        <Card glass className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-lav-100 text-lav-600"><Icon name="lock" size={20} /></span>
          <p className="text-sm text-ink-soft">Only you can read your journal. Nothing is shared with your circle or anyone else. Write what happened, when and where, as soon as you can — details fade quickly.</p>
        </Card>
        {demo || !uid ? (
          <Card><p className="text-ink-muted">Sign in to keep a journal. Demo mode stores nothing.</p></Card>
        ) : !items ? (
          <p className="flex items-center gap-2 text-ink-muted"><Spinner /> Loading…</p>
        ) : !items.length ? (
          <Card className="text-center"><p className="text-ink-muted">No entries yet.</p><Btn className="mt-3" onClick={() => setEdit('new')}>Write the first entry</Btn></Card>
        ) : (
          <div className="space-y-3">
            {items.map((it) => (
              <Card key={it.id} className="!p-0">
                <button onClick={() => setOpen(open === it.id ? null : it.id)} aria-expanded={open === it.id} className="flex w-full items-start gap-3 p-5 text-left">
                  <div className="w-14 shrink-0 rounded-2xl bg-cobalt-50 py-1.5 text-center text-cobalt-800">
                    <p className="text-lg font-bold leading-none">{new Date(it.happenedAt).getDate()}</p>
                    <p className="text-[10px] font-semibold uppercase">{new Date(it.happenedAt).toLocaleString(undefined, { month: 'short' })}</p>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold text-ink">{it.title}</p>
                    <p className="text-xs text-ink-muted">{new Date(it.happenedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}{it.place ? ` · ${it.place}` : ''}</p>
                  </div>
                  <Chip tone={it.category === 'other' ? 'gray' : 'lav'}>{catName(it.category)}</Chip>
                </button>
                <AnimatePresence>
                  {open === it.id && (
                    <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                      <div className="border-t border-line px-5 pb-5 pt-3">
                        <p className="whitespace-pre-wrap text-sm text-ink-soft">{it.text || 'No details written.'}</p>
                        {it.location && <p className="mt-2 text-xs tabular-nums text-ink-muted">Saved location {fmtCoord(it.location.latitude)}, {fmtCoord(it.location.longitude)}</p>}
                        <p className="mt-1 text-xs text-ink-faint">Written {new Date(it.createdAt).toLocaleString()}</p>
                        <div className="mt-3 flex gap-2">
                          <Btn tone="soft" className="!min-h-[38px]" onClick={() => setEdit(it)}><Icon name="edit" size={16} />Edit</Btn>
                          <Btn tone="ghost" className="!min-h-[38px] !text-coral-600" onClick={async () => confirm('Delete this entry permanently?') && (await deleteDoc(doc(db(), `users/${uid}/incidents/${it.id}`)))}><Icon name="trash" size={16} />Delete</Btn>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Card>
            ))}
          </div>
        )}
      </Page>
      {edit && uid && <Editor uid={uid} item={edit === 'new' ? null : edit} onClose={() => setEdit(null)} />}
    </>
  );
}

function Editor({ uid, item, onClose }: { uid: string; item: Incident | null; onClose: () => void }) {
  const { toast } = useApp();
  const [f, setF] = useState({ title: item?.title ?? '', text: item?.text ?? '', category: item?.category ?? ('harassment' as Category), happenedAt: localInput(item ? new Date(item.happenedAt) : new Date()), place: item?.place ?? '' });
  const [withLoc, setWithLoc] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!f.title.trim()) return setErr('Give the entry a short title.');
    setBusy(true);
    try {
      const location = withLoc ? await currentFix().catch(() => null) : item?.location ?? null;
      const data = { title: f.title.trim().slice(0, 120), text: f.text.trim().slice(0, 5000), category: f.category, happenedAt: new Date(f.happenedAt).toISOString(), place: f.place.trim().slice(0, 200) || null, location, createdAt: item?.createdAt ?? new Date().toISOString() };
      const write = item ? setDoc(doc(db(), `users/${uid}/incidents/${item.id}`), data) : addDoc(collection(db(), `users/${uid}/incidents`), data);
      // Offline, the write is kept on this device (persistent cache) and confirmed by the server later.
      if (!navigator.onLine) {
        write.catch(() => toast('A journal entry could not be synchronized.'));
        toast('Saved locally. Will synchronize when connection returns.');
        return onClose();
      }
      await write;
      toast('Saved to your journal.');
      onClose();
    } catch (e2) {
      setErr(`Unable to save: ${(e2 as Error).message}`);
    }
    setBusy(false);
  };

  return (
    <Sheet open onClose={onClose} title={item ? 'Edit entry' : 'New journal entry'}>
      <form onSubmit={save} className="space-y-4">
        <Field label="Title"><input className={inputCls} maxLength={120} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="e.g. Man followed me from the bus stop" /></Field>
        <div>
          <span className="mb-1.5 block text-sm font-semibold text-ink-soft">Type</span>
          <div className="flex flex-wrap gap-2">
            {CATS.map(([c, t]) => (
              <button key={c} type="button" aria-pressed={f.category === c} onClick={() => setF({ ...f, category: c })} className={cx('rounded-full px-3.5 py-2 text-sm font-semibold', f.category === c ? 'bg-lav-600 text-white' : 'bg-lav-50 text-lav-600')}>{t}</button>
            ))}
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="When did it happen?"><input className={inputCls} type="datetime-local" required value={f.happenedAt} max={localInput(new Date())} onChange={(e) => setF({ ...f, happenedAt: e.target.value })} /></Field>
          <Field label="Where (optional)"><input className={inputCls} maxLength={200} value={f.place} onChange={(e) => setF({ ...f, place: e.target.value })} placeholder="Street, building, route…" /></Field>
        </div>
        <Field label="What happened"><textarea className={`${inputCls} min-h-[140px]`} maxLength={5000} value={f.text} onChange={(e) => setF({ ...f, text: e.target.value })} placeholder="Who, what they said or did, how long, any witnesses, vehicle numbers…" /></Field>
        <Toggle on={withLoc} onChange={setWithLoc} label="Attach my current location" hint={item?.location ? 'Replaces the saved location' : 'Only if you are still at the place'} />
        {err && <p role="alert" className="text-sm font-semibold text-coral-600">{err}</p>}
        <Btn big type="submit" className="w-full" disabled={busy}>{busy && <Spinner />}Save entry</Btn>
        <p className="text-center text-xs text-ink-muted">Your journal is a personal record, not a police report.</p>
      </form>
    </Sheet>
  );
}
