import { useState } from 'react';
import { CONFIG } from '@engine/engine';
import { settings, useSettings, resolveQuality } from '@/services/settings';
import { authMessage, signIn, signInGoogle, signOut, signUp, useAuth } from '@/firebase/auth';
import { deleteAll } from '@/services/sessions';
import { Btn, Card, PageHeader, Status, cx } from '@/components/ui';
import { Seg } from './Simulation';

const input = 'w-full rounded-xl bg-white px-3 py-2.5 text-[14px] ring-1 ring-line outline-none focus:ring-4 focus:ring-lpg-100';

function Toggle({ on, onChange, label, hint }: { on: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
  return (
    <button role="switch" aria-checked={on} onClick={() => onChange(!on)} className="flex w-full items-center justify-between gap-4 py-2.5 text-left">
      <span><span className="block font-bold text-graphite">{label}</span>{hint && <span className="block text-[13px] text-graphite-muted">{hint}</span>}</span>
      <span className={cx('relative h-7 w-12 shrink-0 rounded-full transition-colors', on ? 'bg-lpg-600' : 'bg-steel-300')}><span className={cx('absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all', on ? 'left-6' : 'left-1')} /></span>
    </button>
  );
}

export default function Settings() {
  const st = useSettings();
  const auth = useAuth();
  const [f, setF] = useState({ name: '', email: '', password: '' });
  const [mode, setMode] = useState<'in' | 'up'>('in');
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const run = async (fn: () => Promise<void>, ok: string) => {
    setBusy(true);
    setMsg(null);
    try {
      await fn();
      setMsg({ ok: true, t: ok });
    } catch (e) {
      setMsg({ ok: false, t: authMessage(e) });
    }
    setBusy(false);
  };
  return (
    <div className="space-y-4">
      <PageHeader title="Settings" />
      <div className="grid gap-4 xl:grid-cols-2">
        <Card title="Simulation & accessibility">
          <div className="divide-y divide-line">
            <Toggle on={!st.muted} onChange={(v) => settings.set({ muted: !v })} label="Sound" hint="Warning beeps, critical alarm, contained chime, and the cinematic sound in the simulated incident. Every sound also has on-screen text." />
            <Toggle on={st.vibration} onChange={(v) => settings.set({ vibration: v })} label="Vibration" hint="On supported phones, for warnings and the simulated incident." />
            <Toggle on={st.autoSave} onChange={(v) => settings.set({ autoSave: v })} label="Save finished runs to my account" hint="Runs are always kept on this device; this also saves them to Firestore when you are signed in." />
          </div>
          <div className="mt-3 space-y-3">
            <div><p className="mb-1.5 text-sm font-bold text-graphite-soft">Reduced motion</p><Seg value={st.reducedMotion} onChange={(v) => settings.set({ reducedMotion: v })} options={[['auto', 'Follow device'], ['on', 'On'], ['off', 'Off']]} label="Reduced motion" /></div>
            <div><p className="mb-1.5 text-sm font-bold text-graphite-soft">3D quality <span className="font-normal text-graphite-muted">(auto → {resolveQuality()})</span></p><Seg value={st.quality} onChange={(v) => settings.set({ quality: v })} options={[['auto', 'Auto'], ['high', 'High'], ['medium', 'Medium'], ['low', 'Low']]} label="3D quality" /></div>
          </div>
        </Card>
        <Card title="Account" action={auth.user ? <Status tone="ok">SIGNED IN</Status> : <Status tone="info">DEMO MODE</Status>}>
          {!auth.ready ? <p className="text-sm text-graphite-muted">Checking…</p> : !auth.cloud ? (
            <p className="text-sm text-graphite-muted">{auth.error}</p>
          ) : auth.user ? (
            <div className="space-y-3">
              <p className="text-sm text-graphite-soft">Signed in as <b>{auth.user.email}</b>. Finished runs are saved to your account.</p>
              <Btn tone="secondary" disabled={busy} onClick={() => run(signOut, 'Signed out.')}>Sign out</Btn>
            </div>
          ) : (
            <form className="space-y-3" onSubmit={(e) => (e.preventDefault(), run(() => (mode === 'up' ? signUp(f.name, f.email, f.password) : signIn(f.email, f.password)), mode === 'up' ? 'Account created.' : 'Signed in.'))}>
              <p className="text-[13px] text-graphite-muted">Optional — the demo works without an account. Sign in to keep session history in the cloud.</p>
              {mode === 'up' && <input className={input} placeholder="Name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} aria-label="Name" />}
              <input className={input} type="email" required placeholder="Email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} aria-label="Email" />
              <input className={input} type="password" required minLength={6} placeholder="Password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} aria-label="Password" />
              <div className="flex flex-wrap gap-2">
                <Btn type="submit" disabled={busy}>{mode === 'up' ? 'Create account' : 'Sign in'}</Btn>
                <Btn type="button" tone="secondary" disabled={busy} onClick={() => run(signInGoogle, 'Signed in with Google.')}>Continue with Google</Btn>
                <Btn type="button" tone="ghost" onClick={() => setMode(mode === 'in' ? 'up' : 'in')}>{mode === 'in' ? 'Create an account' : 'I have an account'}</Btn>
              </div>
            </form>
          )}
          {msg && <p role="status" className={cx('mt-2 text-sm font-semibold', msg.ok ? 'text-ok-700' : 'text-danger-700')}>{msg.t}</p>}
        </Card>
        <Card title="Data">
          <p className="text-sm text-graphite-muted">Delete every saved session on this device{auth.user ? ' and in your account' : ''}.</p>
          <Btn className="mt-3" tone="danger" disabled={busy} onClick={() => confirm('Delete all saved sessions?') && run(deleteAll, 'Saved sessions deleted.')}>Delete saved sessions</Btn>
        </Card>
        <Card title="About this prototype">
          <ul className="space-y-1.5 text-[13px] text-graphite-soft">
            <li>• <b>Concept / prototype.</b> All telemetry, the alarm, the shutoff and the incident are <b>simulated</b>.</li>
            <li>• No certified sensor accuracy, real gas detection, emergency response or guaranteed prevention is claimed.</li>
            <li>• Cylinder <span className="font-mono">{CONFIG.cylinderId}</span> · Dock <span className="font-mono">{CONFIG.dockId}</span> · thresholds in <span className="font-mono">shared/dock-config.json</span>.</li>
            <li>• In a real gas emergency follow local emergency guidance and call your gas agency / emergency services.</li>
          </ul>
        </Card>
      </div>
    </div>
  );
}
