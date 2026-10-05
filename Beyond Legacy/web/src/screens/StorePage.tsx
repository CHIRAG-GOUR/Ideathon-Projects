import { useState } from 'react';
import { DEFAULT_SETTINGS, type EngineSettings } from '../engine/types';
import { friendlyError } from '../data/repo';
import { useWorkspace } from '../state/session';
import { Button, Card, ErrorNote, Field, Input, SectionTitle, useToast } from '../ui/kit';
import { PageBanner } from '../ui/page';
import { StorefrontMini } from '../art/scenes';

const THRESHOLDS: { key: keyof EngineSettings; label: string; hint: string; min: number; max: number }[] = [
  { key: 'highRiskDays', label: 'High stock-out risk below (days of cover)', hint: 'Below this, or at the safety level, the move is RESTOCK.', min: 1, max: 14 },
  { key: 'reorderWindowDays', label: 'Monitor below (days of cover)', hint: 'Between this and the high-risk level the product is watched (HOLD · monitor).', min: 1, max: 30 },
  { key: 'orderCoverageDays', label: 'Order to cover (days)', hint: 'Suggested orders bring stock to this many days of demand plus safety stock.', min: 1, max: 30 },
  { key: 'slowCoverageDays', label: 'Slow stock at (days of cover)', hint: 'At or above this, the product is slow stock (HOLD — do not buy more).', min: 5, max: 120 },
  { key: 'expiryWatchDays', label: 'Watch expiry within (days)', hint: 'Stock expiring within this window is checked for units likely to go unsold.', min: 1, max: 30 },
];

export default function StorePage() {
  const { workspace, repo } = useWorkspace();
  const toast = useToast();
  const st = workspace.store;
  const [f, setF] = useState({ name: st.name, type: st.type, area: st.area, managerName: st.managerName, openTime: st.openTime, closeTime: st.closeTime, deliveryDays: st.deliveryDays });
  const [t, setT] = useState<Record<keyof EngineSettings, string>>(() => Object.fromEntries(Object.entries(workspace.settings).map(([k, v]) => [k, String(v)])) as Record<keyof EngineSettings, string>);
  const [err, setErr] = useState<string | null>(null);
  const [terr, setTerr] = useState<string | null>(null);
  const [busy, setBusy] = useState<'store' | 'th' | null>(null);

  async function saveStore() {
    setErr(null);
    if (!f.name.trim() || !f.managerName.trim()) return setErr('Store name and manager name are required.');
    if (!/^\d{2}:\d{2}$/.test(f.openTime) || !/^\d{2}:\d{2}$/.test(f.closeTime)) return setErr('Enter opening hours as HH:MM.');
    setBusy('store');
    try {
      await repo.updateStore({ ...f, name: f.name.trim(), managerName: f.managerName.trim(), area: f.area.trim(), deliveryDays: f.deliveryDays.trim() });
      toast('Store details saved');
    } catch (e) {
      setErr(friendlyError(e));
    } finally {
      setBusy(null);
    }
  }

  async function saveThresholds(values: Record<keyof EngineSettings, string>) {
    setTerr(null);
    const s = {} as EngineSettings;
    for (const x of THRESHOLDS) {
      const n = Number(values[x.key]);
      if (!Number.isInteger(n) || n < x.min || n > x.max) return setTerr(`${x.label}: enter a whole number from ${x.min} to ${x.max}.`);
      s[x.key] = n;
    }
    if (s.highRiskDays > s.reorderWindowDays) return setTerr('The monitor window must be at least as long as the high-risk window.');
    if (s.reorderWindowDays >= s.slowCoverageDays) return setTerr('Slow stock must start after the monitor window.');
    setBusy('th');
    try {
      await repo.updateSettings(s);
      toast('Thresholds saved — recommendations recalculated');
    } catch (e) {
      setTerr(friendlyError(e));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-5">
      <PageBanner kicker="Your store" title="Store" sub="Store details and the thresholds behind every recommendation." art={<StorefrontMini className="w-44" />} />
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card className="p-5">
          <SectionTitle title="Store details" />
          <form className="space-y-4" onSubmit={(e) => (e.preventDefault(), saveStore())}>
            <Field label="Store name" htmlFor="st-name"><Input id="st-name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} maxLength={80} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Store type" htmlFor="st-type"><Input id="st-type" value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })} maxLength={60} /></Field>
              <Field label="Location / area" htmlFor="st-area"><Input id="st-area" value={f.area} onChange={(e) => setF({ ...f, area: e.target.value })} maxLength={80} /></Field>
              <Field label="Manager" htmlFor="st-mgr"><Input id="st-mgr" value={f.managerName} onChange={(e) => setF({ ...f, managerName: e.target.value })} maxLength={60} /></Field>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Opens" htmlFor="st-open"><Input id="st-open" type="time" value={f.openTime} onChange={(e) => setF({ ...f, openTime: e.target.value })} /></Field>
                <Field label="Closes" htmlFor="st-close"><Input id="st-close" type="time" value={f.closeTime} onChange={(e) => setF({ ...f, closeTime: e.target.value })} /></Field>
              </div>
            </div>
            <Field label="Delivery schedule" htmlFor="st-del" hint="For your team’s reference, e.g. “Dairy & bakery daily · packaged goods Mon/Thu”."><Input id="st-del" value={f.deliveryDays} onChange={(e) => setF({ ...f, deliveryDays: e.target.value })} maxLength={120} /></Field>
            {err && <ErrorNote>{err}</ErrorNote>}
            <Button tone="primary" type="submit" busy={busy === 'store'}>Save store details</Button>
          </form>
        </Card>
        <Card className="p-5">
          <SectionTitle title="Decision thresholds" sub="Tune how cautious the recommendations are. Changes apply to every product immediately." />
          <form className="space-y-4" onSubmit={(e) => (e.preventDefault(), saveThresholds(t))}>
            {THRESHOLDS.map((x) => (
              <Field key={x.key} label={x.label} hint={x.hint} htmlFor={`th-${x.key}`}>
                <Input id={`th-${x.key}`} inputMode="numeric" value={t[x.key]} onChange={(e) => setT({ ...t, [x.key]: e.target.value.replace(/[^\d]/g, '') })} className="max-w-[140px]" />
              </Field>
            ))}
            {terr && <ErrorNote>{terr}</ErrorNote>}
            <div className="flex flex-wrap gap-2">
              <Button tone="primary" type="submit" busy={busy === 'th'}>Save thresholds</Button>
              <Button type="button" tone="ghost" onClick={() => {
                const d = Object.fromEntries(Object.entries(DEFAULT_SETTINGS).map(([k, v]) => [k, String(v)])) as Record<keyof EngineSettings, string>;
                setT(d);
                saveThresholds(d);
              }}>Restore defaults</Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
