'use client';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { collection, deleteDoc, doc, orderBy, query, setDoc } from 'firebase/firestore';
import { deleteObject, getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import type { EmergencyLocation } from '@shared/types';
import { fmtCoord } from '@shared/geo';
import { useList } from '@core/data';
import { db, storage } from '@core/firebase';
import { currentFix, requestPermission } from '@core/native';
import { Header, Page, useApp } from '@/ctx';
import { Btn, Card, Field, Sheet, Spinner, Toggle, inputCls } from '@/ui/kit';
import { VaultArt } from '@/ui/art';
import { Icon } from '@/ui/icons';

type Kind = 'note' | 'photo' | 'audio';
interface Item { id: string; kind: Kind; title: string; text: string | null; path: string | null; contentType: string | null; size: number | null; at: string; location: EmergencyLocation | null }

/** Safety Evidence Vault: notes, photos and audio — saved only when you choose, visible only to you. */
export function Vault() {
  const { uid, demo } = useApp();
  const items = useList<Item>(uid ? `users/${uid}/vault` : null, (c) => query(c, orderBy('at', 'desc')), [uid]);
  const [add, setAdd] = useState<Kind | null>(null);

  return (
    <>
      <Header title="Evidence vault" sub="Private notes, photos and audio — only you can see them" back />
      <Page>
        <Card className="flex items-center gap-4 !p-5">
          <VaultArt size={72} />
          <div className="min-w-0">
            <p className="font-extrabold text-violet-900">Nothing is recorded automatically.</p>
            <p className="text-sm text-ink-muted">Items are saved to your private storage only when you add them, and never shared with contacts. You can delete any item, or everything from Privacy.</p>
          </div>
        </Card>
        <div className="grid grid-cols-3 gap-3">
          {(
            [
              ['note', 'Write a note', 'note'],
              ['photo', 'Add a photo', 'camera'],
              ['audio', 'Record audio', 'mic'],
            ] as const
          ).map(([k, t, ic]) => (
            <motion.button key={k} whileTap={{ scale: 0.97 }} disabled={demo || !uid} onClick={() => setAdd(k)} className="flex flex-col items-center gap-2 rounded-xl2 border border-line bg-white p-4 text-center shadow-card disabled:opacity-50">
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-violet-800 text-white"><Icon name={ic} /></span>
              <span className="text-sm font-extrabold text-ink">{t}</span>
            </motion.button>
          ))}
        </div>
        {demo || !uid ? (
          <Card><p className="text-ink-muted">Sign in to use the vault. Demo mode stores nothing.</p></Card>
        ) : !items ? (
          <p className="flex items-center gap-2 text-ink-muted"><Spinner /> Loading…</p>
        ) : items.length === 0 ? (
          <Card><p className="text-ink-muted">Your vault is empty.</p></Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">{items.map((i) => <VaultItem key={i.id} item={i} uid={uid} />)}</div>
        )}
      </Page>
      {add && uid && <AddItem kind={add} uid={uid} onClose={() => setAdd(null)} />}
    </>
  );
}

function VaultItem({ item, uid }: { item: Item; uid: string }) {
  const { toast } = useApp();
  const [url, setUrl] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (open && item.path && !url) getDownloadURL(ref(storage(), item.path)).then(setUrl, () => toast('Unable to load this file. Check your connection.'));
  }, [open, item.path, url, toast]);
  const del = async () => {
    if (!confirm(`Delete “${item.title}” permanently?`)) return;
    try {
      if (item.path) await deleteObject(ref(storage(), item.path)).catch((e) => (e.code === 'storage/object-not-found' ? null : Promise.reject(e)));
      await deleteDoc(doc(db(), `users/${uid}/vault/${item.id}`));
      toast('Deleted.');
    } catch (e) {
      toast(`Unable to delete: ${(e as Error).message}`);
    }
  };
  return (
    <Card>
      <button onClick={() => setOpen(!open)} aria-expanded={open} className="flex w-full items-center gap-3 text-left">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-violet-50 text-violet-700"><Icon name={item.kind === 'note' ? 'note' : item.kind === 'photo' ? 'camera' : 'mic'} size={20} /></span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-extrabold text-ink">{item.title}</span>
          <span className="block text-xs text-ink-muted">{new Date(item.at).toLocaleString()}{item.size ? ` · ${(item.size / 1024 / 1024).toFixed(1)} MB` : ''}</span>
        </span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="mt-3 space-y-2 border-t border-line pt-3">
              {item.text && <p className="whitespace-pre-wrap text-sm text-ink-soft">{item.text}</p>}
              {item.kind === 'photo' && (url ? <img src={url} alt={item.title} className="max-h-80 w-full rounded-2xl object-contain" /> : <Spinner />)}
              {item.kind === 'audio' && (url ? <audio controls src={url} className="w-full" /> : <Spinner />)}
              {item.location && <p className="text-xs tabular-nums text-ink-muted">Location {fmtCoord(item.location.latitude)}, {fmtCoord(item.location.longitude)}</p>}
              <button onClick={del} className="flex items-center gap-1.5 text-sm font-bold text-alert-600"><Icon name="trash" size={16} />Delete</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}

function AddItem({ kind, uid, onClose }: { kind: Kind; uid: string; onClose: () => void }) {
  const { toast } = useApp();
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [file, setFile] = useState<Blob | null>(null);
  const [withLoc, setWithLoc] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [rec, setRec] = useState<{ r: MediaRecorder; started: number } | null>(null);
  const [secs, setSecs] = useState(0);
  const chunks = useRef<Blob[]>([]);

  useEffect(() => {
    if (!rec) return;
    const t = setInterval(() => setSecs(Math.round((Date.now() - rec.started) / 1000)), 500);
    return () => clearInterval(t);
  }, [rec]);
  useEffect(() => () => rec?.r.stream.getTracks().forEach((t) => t.stop()), [rec]);

  const startRec = async () => {
    setErr(null);
    try {
      await requestPermission('microphone');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const r = new MediaRecorder(stream);
      chunks.current = [];
      r.ondataavailable = (e) => chunks.current.push(e.data);
      r.onstop = () => {
        setFile(new Blob(chunks.current, { type: r.mimeType || 'audio/webm' }));
        stream.getTracks().forEach((t) => t.stop());
      };
      r.start();
      setRec({ r, started: Date.now() });
    } catch {
      setErr('Microphone not available. Allow microphone access for She Shield and try again.');
    }
  };
  const stopRec = () => {
    rec?.r.stop();
    setRec(null);
  };

  const save = async () => {
    setErr(null);
    if (kind !== 'note' && !file) return setErr(kind === 'photo' ? 'Choose or take a photo first.' : 'Record something first.');
    if (kind === 'note' && !text.trim()) return setErr('Write something first.');
    if (file && file.size > 25 * 1024 * 1024) return setErr('Files must be under 25 MB.');
    setBusy(true);
    try {
      const id = doc(collection(db(), `users/${uid}/vault`)).id;
      let path: string | null = null;
      if (file) {
        path = `users/${uid}/vault/${id}/file`;
        await uploadBytes(ref(storage(), path), file, { contentType: file.type });
      }
      const location = withLoc ? await currentFix().catch(() => null) : null;
      await setDoc(doc(db(), `users/${uid}/vault/${id}`), {
        kind, title: (title.trim() || { note: 'Note', photo: 'Photo', audio: 'Audio recording' }[kind]).slice(0, 120), text: text.trim() || null,
        path, contentType: file?.type ?? null, size: file?.size ?? null, at: new Date().toISOString(), location,
      });
      toast(withLoc && !location ? 'Saved — location was unavailable.' : 'Saved to your vault.');
      onClose();
    } catch (e) {
      setErr(navigator.onLine ? `Unable to save: ${(e as Error).message}` : 'No connection — the vault needs internet to upload. Nothing was saved.');
    }
    setBusy(false);
  };

  return (
    <Sheet open onClose={() => !busy && onClose()} title={{ note: 'New note', photo: 'Add a photo', audio: 'Record audio' }[kind]}>
      <div className="space-y-4">
        <Field label="Title (optional)"><input className={inputCls} maxLength={120} value={title} onChange={(e) => setTitle(e.target.value)} /></Field>
        {kind === 'photo' && (
          <label className="flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-violet-200 p-6 text-center">
            <Icon name="camera" />
            <span className="font-bold text-violet-800">{file ? 'Photo selected ✓ — tap to change' : 'Take or choose a photo'}</span>
            <input type="file" accept="image/*" capture="environment" className="sr-only" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </label>
        )}
        {kind === 'audio' && (
          <div className="flex flex-col items-center gap-3 rounded-2xl bg-violet-50 p-5">
            <p className="text-3xl font-extrabold tabular-nums text-violet-900">{rec ? `● ${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}` : file ? 'Recorded ✓' : '0:00'}</p>
            {rec ? <Btn tone="alert" onClick={stopRec}>Stop recording</Btn> : <Btn onClick={startRec}><Icon name="mic" size={18} />{file ? 'Record again' : 'Start recording'}</Btn>}
            <p className="text-xs text-ink-muted">Recording runs only while this screen is open and you can see the timer.</p>
          </div>
        )}
        <Field label={kind === 'note' ? 'Note' : 'Description (optional)'}>
          <textarea className={`${inputCls} min-h-[110px]`} maxLength={5000} value={text} onChange={(e) => setText(e.target.value)} placeholder={kind === 'note' ? 'What happened, where, when, who…' : ''} />
        </Field>
        <Toggle on={withLoc} onChange={setWithLoc} label="Attach my current location" hint="Off by default" />
        {err && <p role="alert" className="text-sm font-semibold text-alert-600">{err}</p>}
        <Btn big className="w-full" onClick={save} disabled={busy || !!rec}>{busy && <Spinner />}Save to vault</Btn>
      </div>
    </Sheet>
  );
}
