'use client';

import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';
import { BarChart3, Building2, Car, KeyRound, ListChecks, Loader2, LogOut, Map as MapIcon, Plus, ShieldCheck } from 'lucide-react';
import type { User } from 'firebase/auth';
import type { ReportStatus, RoadAuthority, RoadHazard, Vehicle } from '@/types';
import { api, firebase, firebaseConfigured } from '@/lib/firebase';
import { watchHazards, toMarkers } from '@/lib/hazards';
import { ReportDetail } from '@/features/reports/ReportDetail';
import { SeverityChip, StatusChip, ModeBadge } from '@/components/Chips';
import { ADMIN_STATUSES, STATUS_LABEL } from '@/server/authority/status';
import { SOURCE, placeName, when } from '@/lib/meta';
import { cn } from '@/lib/cn';

const MapView = dynamic(() => import('@/components/MapView'), { ssr: false });

type Tab = 'overview' | 'map' | 'reports' | 'vehicles' | 'authorities';

export function AdminApp() {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [me, setMe] = useState<{ admin: boolean; email: string | null; emailVerified: boolean } | null>(null);

  useEffect(() => {
    if (!firebaseConfigured) return setUser(null);
    let un: (() => void) | undefined;
    (async () => {
      const { auth } = await firebase();
      const { onAuthStateChanged } = await import('firebase/auth');
      un = onAuthStateChanged(auth, async (u) => {
        setUser(u);
        setMe(null);
        if (u && !u.isAnonymous) setMe(await api<{ admin: boolean; email: string | null; emailVerified: boolean }>('/api/admin/me', { user: u }).catch(() => ({ admin: false, email: u.email, emailVerified: u.emailVerified })));
      });
    })();
    return () => un?.();
  }, []);

  if (user === undefined) return <div className="page py-10"><div className="h-40 animate-pulse rounded-3xl bg-paper-200" /></div>;
  if (!user || user.isAnonymous) return <SignIn />;
  if (!me) return <div className="page py-10 text-graphite-muted">Checking access…</div>;
  if (!me.admin)
    return (
      <div className="page max-w-md py-12">
        <div className="card p-6 text-center" data-testid="not-admin">
          <ShieldCheck className="mx-auto h-10 w-10 text-graphite-faint" />
          <p className="mt-3 font-bold text-graphite">This account isn’t a RoadPulse administrator.</p>
          <p className="mt-1 text-sm text-graphite-muted">
            Signed in as {me.email}. {me.emailVerified ? 'Ask the project owner to add this email to config/admins.' : 'Verify your email address first (check your inbox), then reload.'}
          </p>
          <button onClick={() => firebase().then(async ({ auth }) => (await import('firebase/auth')).signOut(auth))} className="btn btn-secondary mt-4">
            Sign out
          </button>
        </div>
      </div>
    );
  return <Dashboard user={user} email={me.email ?? ''} />;
}

function SignIn() {
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  async function go(kind: 'google' | 'signin' | 'signup') {
    setBusy(true);
    setErr(null);
    try {
      const { auth } = await firebase();
      const a = await import('firebase/auth');
      if (kind === 'google') await a.signInWithPopup(auth, new a.GoogleAuthProvider());
      else if (kind === 'signin') await a.signInWithEmailAndPassword(auth, email, pw);
      else {
        const c = await a.createUserWithEmailAndPassword(auth, email, pw);
        await a.sendEmailVerification(c.user);
        setInfo('Account created — we sent a verification email.');
      }
    } catch (e) {
      setErr((e as Error).message.replace('Firebase: ', ''));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="page max-w-md py-12">
      <div className="card p-6" data-testid="admin-signin">
        <p className="eyebrow">Road authority dashboard</p>
        <h1 className="display mt-1 text-2xl">Administrator sign-in</h1>
        <p className="mt-1 text-sm text-graphite-muted">Only verified emails listed by the project owner can review reports and configure routing.</p>
        {!firebaseConfigured && <p className="mt-3 rounded-2xl bg-amber-50 p-3 text-sm text-amber-700">Firebase isn’t configured for this site yet.</p>}
        <button onClick={() => go('google')} disabled={busy} className="btn btn-secondary mt-5 w-full">
          Continue with Google
        </button>
        <div className="my-4 text-center text-xs font-bold uppercase text-graphite-faint">or</div>
        <div className="space-y-2">
          <input className="field" type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} data-testid="admin-email" />
          <input className="field" type="password" placeholder="Password" value={pw} onChange={(e) => setPw(e.target.value)} data-testid="admin-password" />
          {err && <p className="text-sm font-semibold text-pothole-600">{err}</p>}
          {info && <p className="text-sm font-semibold text-road-600">{info}</p>}
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => go('signin')} disabled={busy || !email || !pw} className="btn btn-primary" data-testid="admin-signin-btn">
              {busy && <Loader2 className="h-4 w-4 animate-spin" />} Sign in
            </button>
            <button onClick={() => go('signup')} disabled={busy || !email || pw.length < 8} className="btn btn-secondary">
              Create account
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Dashboard({ user, email }: { user: User; email: string }) {
  const [tab, setTab] = useState<Tab>('overview');
  const [hazards, setHazards] = useState<RoadHazard[] | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  useEffect(() => {
    let un: (() => void) | undefined;
    watchHazards({ max: 2000 }, setHazards).then((u) => (un = u));
    return () => un?.();
  }, []);
  const TABS: { key: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { key: 'overview', label: 'Overview', icon: BarChart3 },
    { key: 'map', label: 'Map', icon: MapIcon },
    { key: 'reports', label: 'Reports', icon: ListChecks },
    { key: 'vehicles', label: 'Vehicles', icon: Car },
    { key: 'authorities', label: 'Authorities', icon: Building2 },
  ];
  return (
    <div className="page py-6" data-testid="dashboard">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="eyebrow">Dashboard</p>
          <h1 className="display mt-1 text-3xl">Road authority</h1>
        </div>
        <div className="flex items-center gap-2 text-sm text-graphite-muted">
          <ModeBadge mode="live" /> {email}
          <button onClick={() => firebase().then(async ({ auth }) => (await import('firebase/auth')).signOut(auth))} className="btn btn-ghost h-9 min-h-0 px-2" aria-label="Sign out">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div className="mt-4 flex gap-1 overflow-x-auto rounded-2xl bg-white p-1 ring-1 ring-paper-200">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)} className={cn('flex flex-none items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-semibold', tab === t.key ? 'bg-graphite text-white' : 'text-graphite-soft hover:bg-paper-100')} data-testid={`tab-${t.key}`}>
            <t.icon className="h-4 w-4" /> {t.label}
          </button>
        ))}
      </div>
      <div className="mt-5">
        {tab === 'overview' && <Overview hazards={hazards} />}
        {tab === 'map' && <AdminMap hazards={hazards} onOpen={(id) => { setOpen(id); setTab('reports'); }} />}
        {tab === 'reports' && <Reports hazards={hazards} open={open} setOpen={setOpen} user={user} />}
        {tab === 'vehicles' && <Vehicles user={user} />}
        {tab === 'authorities' && <Authorities />}
      </div>
    </div>
  );
}

const OPEN: ReportStatus[] = ['created', 'submitted', 'submission_failed', 'pending_manual_submission'];

function Overview({ hazards }: { hazards: RoadHazard[] | null }) {
  const [vehiclesActive, setVehiclesActive] = useState<number | null>(null);
  useEffect(() => {
    (async () => {
      const { db } = await firebase();
      const { collection, getCountFromServer, query, where } = await import('firebase/firestore');
      const since = new Date(Date.now() - 10 * 60_000).toISOString();
      setVehiclesActive((await getCountFromServer(query(collection(db, 'vehicles'), where('lastSeenAt', '>=', since)))).data().count);
    })().catch(() => setVehiclesActive(null));
  }, [hazards?.length]);
  const s = useMemo(() => {
    const h = hazards ?? [];
    const conf = h.filter((x) => x.confidence != null).map((x) => x.confidence!);
    const areas = new Map<string, number>();
    for (const x of h) {
      const k = x.address?.city ?? x.address?.district ?? 'Unknown area';
      areas.set(k, (areas.get(k) ?? 0) + 1);
    }
    return {
      total: h.length,
      citizen: h.filter((x) => x.source === 'citizen').length,
      vehicle: h.filter((x) => x.source === 'vehicle').length,
      open: h.filter((x) => OPEN.includes(x.reportStatus)).length,
      review: h.filter((x) => x.reportStatus === 'under_review' || x.reportStatus === 'assigned').length,
      resolved: h.filter((x) => x.reportStatus === 'resolved').length,
      high: h.filter((x) => x.severity === 'high').length,
      submitted: h.filter((x) => x.reportStatus === 'submitted').length,
      pending: h.filter((x) => x.reportStatus === 'pending_manual_submission' || x.reportStatus === 'submission_failed').length,
      avgConf: conf.length ? Math.round((conf.reduce((a, b) => a + b, 0) / conf.length) * 100) : null,
      areas: [...areas.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5),
    };
  }, [hazards]);
  if (!hazards) return <div className="h-40 animate-pulse rounded-3xl bg-paper-200" />;
  const tiles: [string, string | number, string][] = [
    ['Potholes reported', s.total, 'overview-total'],
    ['Open', s.open, 'overview-open'],
    ['Under review', s.review, 'overview-review'],
    ['Resolved', s.resolved, 'overview-resolved'],
    ['High severity', s.high, 'overview-high'],
    ['Vehicles active', vehiclesActive ?? '—', 'overview-vehicles'],
  ];
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        {tiles.map(([label, v, id]) => (
          <motion.div key={label} layout className="card p-4" data-testid={id}>
            <p className="text-xs font-bold uppercase tracking-wider text-graphite-muted">{label}</p>
            <motion.p key={String(v)} initial={{ opacity: 0.3, y: 6 }} animate={{ opacity: 1, y: 0 }} className="num mt-1 font-display text-3xl font-bold text-graphite">
              {v}
            </motion.p>
          </motion.div>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card p-5">
          <p className="font-bold text-graphite">Analytics</p>
          <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
            {[
              ['Citizen reports', s.citizen],
              ['Vehicle detections', s.vehicle],
              ['Reports submitted to authorities', s.submitted],
              ['Reports pending', s.pending],
              ['Average detection confidence', s.avgConf != null ? `${s.avgConf}%` : '—'],
            ].map(([k, v]) => (
              <div key={String(k)}>
                <dt className="text-graphite-muted">{k}</dt>
                <dd className="num text-xl font-bold text-graphite">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="card p-5">
          <p className="font-bold text-graphite">Most affected areas</p>
          {s.areas.length === 0 && <p className="mt-2 text-sm text-graphite-muted">No reports yet.</p>}
          <ul className="mt-3 space-y-2">
            {s.areas.map(([a, n]) => (
              <li key={a}>
                <div className="flex justify-between text-sm font-semibold text-graphite">
                  <span>{a}</span>
                  <span className="num">{n}</span>
                </div>
                <div className="mt-1 h-2 rounded-full bg-paper-200">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${(n / s.areas[0][1]) * 100}%` }} className="h-2 rounded-full bg-pothole-400" />
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <p className="text-xs text-graphite-muted">All numbers come from the live database — nothing here is simulated.</p>
    </div>
  );
}

function AdminMap({ hazards, onOpen }: { hazards: RoadHazard[] | null; onOpen: (id: string) => void }) {
  const [src, setSrc] = useState<'all' | 'vehicle' | 'citizen'>('all');
  const shown = (hazards ?? []).filter((h) => src === 'all' || h.source === src);
  return (
    <div>
      <SourceFilter value={src} onChange={setSrc} />
      <div className="mt-3 h-[65vh] overflow-hidden rounded-3xl ring-1 ring-paper-300">
        <MapView hazards={toMarkers(shown, false)} cluster fitToHazards onHazardClick={onOpen} className="h-full w-full" />
      </div>
    </div>
  );
}

function SourceFilter({ value, onChange }: { value: 'all' | 'vehicle' | 'citizen'; onChange: (v: 'all' | 'vehicle' | 'citizen') => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {(['all', 'vehicle', 'citizen'] as const).map((f) => (
        <button key={f} onClick={() => onChange(f)} className={cn('chip py-2 text-sm ring-1 ring-inset', value === f ? 'bg-graphite text-white ring-graphite' : 'bg-white text-graphite-soft ring-paper-300')}>
          {f === 'all' ? 'All' : f === 'vehicle' ? '🚗 Vehicle detections' : '📱 Citizen reports'}
        </button>
      ))}
    </div>
  );
}

function Reports({ hazards, open, setOpen, user }: { hazards: RoadHazard[] | null; open: string | null; setOpen: (id: string | null) => void; user: User }) {
  const [src, setSrc] = useState<'all' | 'vehicle' | 'citizen'>('all');
  const [status, setStatus] = useState<ReportStatus | 'all'>('all');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const list = (hazards ?? []).filter((h) => (src === 'all' || h.source === src) && (status === 'all' || h.reportStatus === status));
  async function change(id: string, s: (typeof ADMIN_STATUSES)[number]) {
    setBusy(true);
    setMsg(null);
    try {
      await api(`/api/admin/hazards/${id}`, { method: 'PATCH', body: { status: s, note: note || null }, user });
      setNote('');
      setMsg(`Marked ${STATUS_LABEL[s]}.`);
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (open)
    return (
      <div>
        <button onClick={() => setOpen(null)} className="text-sm font-semibold text-gps-600">
          ← All reports
        </button>
        <div className="mt-3 grid gap-4 lg:grid-cols-[1fr_320px]">
          <ReportDetail id={open} admin />
          <div className="card h-fit p-4" data-testid="review-panel">
            <p className="font-bold text-graphite">Review</p>
            <textarea className="field mt-2 min-h-[70px] text-sm" placeholder="Note (optional, visible to the reporter)" value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} />
            <div className="mt-2 grid grid-cols-2 gap-2">
              {ADMIN_STATUSES.map((s) => (
                <button key={s} disabled={busy} onClick={() => change(open, s)} className={cn('btn h-11 min-h-0 text-sm', s === 'resolved' ? 'btn-primary' : s === 'rejected' ? 'btn-ghost ring-1 ring-paper-300' : 'btn-secondary')} data-testid={`set-${s}`}>
                  {STATUS_LABEL[s]}
                </button>
              ))}
            </div>
            {msg && <p className="mt-2 text-sm font-semibold text-graphite-soft" data-testid="review-msg">{msg}</p>}
            <p className="mt-3 text-xs text-graphite-muted">“Resolved” should only be set when the repair is actually confirmed.</p>
          </div>
        </div>
      </div>
    );
  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <SourceFilter value={src} onChange={setSrc} />
        <select className="field ml-auto w-auto py-2 text-sm" value={status} onChange={(e) => setStatus(e.target.value as ReportStatus | 'all')}>
          <option value="all">All statuses</option>
          {Object.entries(STATUS_LABEL).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
      </div>
      <div className="mt-3 overflow-hidden rounded-3xl ring-1 ring-paper-200">
        <table className="w-full bg-white text-left text-sm">
          <thead className="bg-paper-100 text-xs uppercase tracking-wider text-graphite-muted">
            <tr>
              <th className="p-3">Report</th>
              <th className="hidden p-3 md:table-cell">Location</th>
              <th className="p-3">Severity</th>
              <th className="p-3">Status</th>
            </tr>
          </thead>
          <tbody data-testid="admin-reports">
            {list.slice(0, 300).map((h) => (
              <tr key={h.id} onClick={() => setOpen(h.id)} className="cursor-pointer border-t border-paper-200 hover:bg-paper-50" data-testid="admin-report-row">
                <td className="p-3">
                  <p className="num font-bold text-graphite">{h.id}</p>
                  <p className="text-xs text-graphite-muted">
                    {SOURCE[h.source].icon} {when(h.createdAt)}
                    {h.groupSize > 1 ? ` · ${h.groupSize} reports` : ''}
                  </p>
                </td>
                <td className="hidden p-3 text-graphite-soft md:table-cell">{placeName(h.address, h.latitude, h.longitude)}</td>
                <td className="p-3">
                  <SeverityChip severity={h.severity} />
                </td>
                <td className="p-3">
                  <StatusChip status={h.reportStatus} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {list.length === 0 && <p className="bg-white p-6 text-center text-sm text-graphite-muted">No reports match.</p>}
      </div>
    </div>
  );
}

function Vehicles({ user }: { user: User }) {
  const [list, setList] = useState<Vehicle[] | null>(null);
  const [name, setName] = useState('');
  const [created, setCreated] = useState<{ id: string; name: string; key: string } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    let un: (() => void) | undefined;
    (async () => {
      const { db } = await firebase();
      const { collection, onSnapshot } = await import('firebase/firestore');
      un = onSnapshot(collection(db, 'vehicles'), (s) => setList(s.docs.map((d) => d.data() as Vehicle)), () => setErr('Couldn’t load vehicles.'));
    })();
    return () => un?.();
  }, []);
  async function add() {
    setErr(null);
    try {
      setCreated(await api<{ id: string; name: string; key: string }>('/api/admin/vehicles', { body: { name }, user }));
      setName('');
    } catch (e) {
      setErr((e as Error).message);
    }
  }
  const active = (v: Vehicle) => v.lastSeenAt && Date.now() - Date.parse(v.lastSeenAt) < 10 * 60_000;
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
      <div className="space-y-2" data-testid="vehicles">
        {list?.length === 0 && <p className="card p-6 text-sm text-graphite-muted">No vehicles registered yet.</p>}
        {list?.map((v) => (
          <div key={v.id} className="card flex flex-wrap items-center justify-between gap-3 p-4" data-testid="vehicle-row">
            <div>
              <p className="font-bold text-graphite">
                🚗 {v.name} {active(v) && <span className="chip ml-1 bg-road-50 text-road-700">Active</span>}
              </p>
              <p className="num text-xs text-graphite-muted">
                {v.id} · {v.detections} detections · {v.lastSeenAt ? `last seen ${when(v.lastSeenAt)}` : 'never connected'}
              </p>
            </div>
            <button onClick={() => api(`/api/admin/vehicles/${v.id}`, { method: 'PATCH', body: { enabled: !v.enabled }, user }).catch((e) => setErr(e.message))} className={cn('btn h-9 min-h-0 px-3 text-sm', v.enabled ? 'btn-secondary' : 'btn-primary')}>
              {v.enabled ? 'Disable' : 'Enable'}
            </button>
          </div>
        ))}
      </div>
      <div className="card h-fit p-4">
        <p className="font-bold text-graphite">Register a vehicle</p>
        <p className="text-xs text-graphite-muted">You’ll get a device ID and key to pair the vehicle’s phone or edge device.</p>
        <input className="field mt-3" placeholder="Name, e.g. Municipal van 07" value={name} onChange={(e) => setName(e.target.value)} data-testid="vehicle-name" />
        <button onClick={add} disabled={name.trim().length < 2} className="btn btn-primary mt-2 w-full" data-testid="vehicle-add">
          <Plus className="h-4 w-4" /> Register
        </button>
        {err && <p className="mt-2 text-sm font-semibold text-pothole-600">{err}</p>}
        {created && (
          <div className="mt-3 rounded-2xl bg-amber-50 p-3 text-sm" data-testid="vehicle-key">
            <p className="flex items-center gap-1.5 font-bold text-amber-700">
              <KeyRound className="h-4 w-4" /> Copy this now — it won’t be shown again
            </p>
            <p className="mt-1 break-all">
              Device ID: <code data-testid="new-device-id">{created.id}</code>
            </p>
            <p className="break-all">
              Key: <code data-testid="new-device-key">{created.key}</code>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

const EMPTY: Omit<RoadAuthority, 'id'> = { name: '', jurisdiction: '', country: 'India', state: '', district: '', city: '', submissionMethod: 'portal', endpoint: '', email: '', category: 'Pothole', sourceUrl: '', enabled: true };

function Authorities() {
  const [list, setList] = useState<RoadAuthority[] | null>(null);
  const [form, setForm] = useState<Omit<RoadAuthority, 'id'> & { id?: string }>(EMPTY);
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => {
    let un: (() => void) | undefined;
    (async () => {
      const { db } = await firebase();
      const { collection, onSnapshot } = await import('firebase/firestore');
      un = onSnapshot(collection(db, 'authorities'), (s) => setList(s.docs.map((d) => ({ ...(d.data() as RoadAuthority), id: d.id }))));
    })();
    return () => un?.();
  }, []);
  const set = (k: keyof RoadAuthority, v: string | boolean) => setForm((f) => ({ ...f, [k]: v }));
  async function save() {
    setMsg(null);
    if (!form.sourceUrl) return setMsg('Add the official page you verified this information from.');
    try {
      const { db } = await firebase();
      const { doc, setDoc } = await import('firebase/firestore');
      const id = form.id || form.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
      const clean = Object.fromEntries(Object.entries({ ...form, id }).filter(([, v]) => v !== '' && v !== undefined));
      await setDoc(doc(db, 'authorities', id), clean);
      setForm(EMPTY);
      setMsg('Saved.');
    } catch (e) {
      setMsg((e as Error).message);
    }
  }
  const F = (k: keyof RoadAuthority, label: string, ph = '') => (
    <label className="block">
      <span className="label text-xs">{label}</span>
      <input className="field py-2 text-sm" value={(form[k] as string) ?? ''} placeholder={ph} onChange={(e) => set(k, e.target.value)} data-testid={`auth-${k}`} />
    </label>
  );
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
      <div className="space-y-2" data-testid="authorities">
        <p className="rounded-2xl bg-paper-100 p-3 text-sm text-graphite-soft">
          Reports are routed to the most specific enabled authority whose area matches the report’s geocoded address. Enter only verified official contacts — RoadPulse never invents endpoints.
        </p>
        {list?.length === 0 && <p className="card p-6 text-sm text-graphite-muted">No authorities configured — reports are saved with “Authority routing unavailable”.</p>}
        {list?.map((a) => (
          <div key={a.id} className="card flex flex-wrap items-start justify-between gap-3 p-4" data-testid="authority-row">
            <div className="min-w-0">
              <p className="font-bold text-graphite">
                {a.name} {!a.enabled && <span className="chip ml-1 bg-paper-200 text-graphite-muted">Disabled</span>}
              </p>
              <p className="text-xs text-graphite-muted">
                {[a.city, a.district, a.state, a.country].filter(Boolean).join(', ')} · {a.submissionMethod.toUpperCase()}
              </p>
              {a.sourceUrl && (
                <a href={a.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-gps-600">
                  Verified source ↗
                </a>
              )}
            </div>
            <button onClick={() => setForm(a)} className="btn btn-secondary h-9 min-h-0 px-3 text-sm">
              Edit
            </button>
          </div>
        ))}
      </div>
      <div className="card h-fit space-y-2 p-4" data-testid="authority-form">
        <p className="font-bold text-graphite">{form.id ? 'Edit authority' : 'Add authority'}</p>
        {F('name', 'Authority name', 'e.g. Meerut Municipal Corporation')}
        {F('jurisdiction', 'Jurisdiction (shown to citizens)')}
        <div className="grid grid-cols-2 gap-2">
          {F('city', 'City')}
          {F('district', 'District')}
          {F('state', 'State')}
          {F('country', 'Country')}
        </div>
        <label className="block">
          <span className="label text-xs">Submission method</span>
          <select className="field py-2 text-sm" value={form.submissionMethod} onChange={(e) => set('submissionMethod', e.target.value)} data-testid="auth-method">
            <option value="portal">Official portal (citizen continues there)</option>
            <option value="email">Official email address</option>
            <option value="api">Official API</option>
            <option value="manual">Manual (no online channel)</option>
          </select>
        </label>
        {(form.submissionMethod === 'api' || form.submissionMethod === 'portal' || form.submissionMethod === 'manual') && F('endpoint', form.submissionMethod === 'api' ? 'API endpoint (https)' : 'Official portal URL')}
        {form.submissionMethod === 'email' && F('email', 'Official reporting email')}
        {form.submissionMethod === 'api' && (
          <div className="grid grid-cols-2 gap-2">
            {F('apiAuthHeader', 'Auth header name', 'X-Api-Key')}
            {F('apiKeySecret', 'Server secret name', 'AUTHORITY_KEY_…')}
          </div>
        )}
        {F('sourceUrl', 'Verified from (official page URL)')}
        <label className="flex items-center gap-2 text-sm font-semibold text-graphite-soft">
          <input type="checkbox" checked={form.enabled} onChange={(e) => set('enabled', e.target.checked)} /> Enabled
        </label>
        {msg && <p className="text-sm font-semibold text-graphite-soft" data-testid="auth-msg">{msg}</p>}
        <div className="grid grid-cols-2 gap-2">
          <button onClick={save} disabled={!form.name || !form.jurisdiction} className="btn btn-primary" data-testid="auth-save">
            Save
          </button>
          <button onClick={() => setForm(EMPTY)} className="btn btn-secondary">
            Clear
          </button>
        </div>
      </div>
    </div>
  );
}
