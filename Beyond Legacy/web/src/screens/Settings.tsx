import { useState } from 'react';
import { fmt1 } from '../engine/analyze';
import { friendlyError } from '../data/repo';
import { resetLocalWorkspace } from '../data/local';
import { useWorkspace } from '../state/session';
import { IconDownload } from '../ui/icons';
import { Button, Card, Kicker, SectionTitle, Sheet, useToast } from '../ui/kit';
import { PageBanner } from '../ui/page';

function csvCell(v: unknown) {
  const s = String(v ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export default function Settings() {
  const s = useWorkspace();
  const { workspace, analysis, repo } = s;
  const toast = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<null | 'demo' | 'reset'>(null);
  const demoCount = workspace.products.filter((p) => p.demo).length;

  async function run(key: string, fn: () => Promise<void>, ok: string) {
    setBusy(key);
    try {
      await fn();
      toast(ok);
    } catch (e) {
      toast(friendlyError(e), 'error');
    } finally {
      setBusy(null);
      setConfirm(null);
    }
  }

  function exportCsv() {
    const head = ['Product', 'Category', 'Stock', 'Daily demand', 'Days of cover', 'Expiry', 'Recommendation', 'Suggested order', 'Reason', 'Unit price', 'Safety stock', 'Supplier'];
    const rows = analysis.products.map((a) => [a.product.name, a.product.category, a.product.stock, fmt1(a.demand.daily), a.coverageDays === null ? '' : fmt1(a.coverageDays), a.product.expiryDate ?? '', a.recommendation.headline, a.recommendation.quantity ?? '', a.recommendation.summary, a.product.unitPrice, a.product.safetyStock, a.product.supplier]);
    const csv = [head, ...rows].map((r) => r.map(csvCell).join(',')).join('\n');
    const name = `beyond-legacy-inventory-${s.todayStr}.csv`;
    const native = (window as unknown as { BeyondLegacyApp?: { shareFile(name: string, mime: string, text: string): void } }).BeyondLegacyApp;
    if (native) return native.shareFile(name, 'text/csv', csv);
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = Object.assign(document.createElement('a'), { href: url, download: name });
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-5">
      <PageBanner kicker="Account & data" title="Settings" sub="Account, data and how recommendations are made." tone="deep" />
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card className="p-5">
          <SectionTitle title="Store Profile & Access" />
          <div className="space-y-3 text-[14px]">
            <p className="text-ink-2">Store: <b className="text-ink">{workspace.store.name}</b></p>
            <p className="text-[13px] text-ink-muted">Direct Access Mode · Fast offline-first inventory predictions and automated reorder triggers.</p>
            <div className="flex flex-wrap gap-2 pt-1">
              <Button tone="light" onClick={() => setConfirm('reset')}>Reset to Default Store</Button>
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <SectionTitle title="Data" />
          <div className="space-y-4 text-[14px]">
            <div>
              <p className="font-semibold text-ink">Demo store</p>
              <p className="mt-0.5 text-[13px] text-ink-muted">{demoCount ? `${demoCount} demo products are loaded alongside ${workspace.products.length - demoCount} of your own.` : '47 sample convenience-store products with four weeks of sales, analysed like real data.'}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <Button busy={busy === 'load'} onClick={() => run('load', () => repo.loadDemo(), 'Demo store loaded')}>{demoCount ? 'Reload demo data' : 'Load demo store'}</Button>
                {demoCount > 0 && <Button tone="danger" onClick={() => setConfirm('demo')}>Remove demo data</Button>}
              </div>
            </div>
            <div className="border-t border-line pt-4">
              <p className="font-semibold text-ink">Export</p>
              <p className="mt-0.5 text-[13px] text-ink-muted">Inventory with today’s recommendations, as a spreadsheet (CSV).</p>
              <Button className="mt-2" onClick={exportCsv} disabled={!analysis.products.length}><IconDownload size={17} />Export inventory CSV</Button>
            </div>
          </div>
        </Card>

        <Card className="p-5 lg:col-span-2">
          <SectionTitle title="How recommendations are made" />
          <div className="grid gap-4 text-[13.5px] text-ink-2 md:grid-cols-4">
            {[
              ['Demand', 'Average units sold per day over the last 7 complete days. With less history, it blends recorded sales with your estimate.'],
              ['Stock-out', `Days of cover = stock ÷ demand. Under ${workspace.settings.highRiskDays} days, or at the safety level → Restock. Under ${workspace.settings.reorderWindowDays} days → monitor.`],
              ['Expiry', `For stock expiring within ${workspace.settings.expiryWatchDays} days: units unlikely to sell before expiry → Sell soon. Expired stock → Remove.`],
              ['Slow stock', `${workspace.settings.slowCoverageDays}+ days of cover, or no sales for a week → Hold. Orders are rounded up to the case size.`],
            ].map(([t, d]) => (
              <div key={t}><Kicker>{t}</Kicker><p className="mt-1">{d}</p></div>
            ))}
          </div>
          <p className="mt-4 rounded-xl bg-canvas px-3 py-2.5 text-[13px] text-ink-muted">These are transparent rules, not a trained model — every explanation in the app is built from the product’s own numbers. No external AI service is connected. The engine is a separate module, so a forecasting model can replace it later without changing the screens.</p>
        </Card>

        <Card className="p-5 lg:col-span-2">
          <p className="font-display text-[15px] font-bold text-ink">Beyond Legacy <span className="font-sans text-[13px] font-medium text-ink-muted">· version 1.0.0</span></p>
          <p className="mt-0.5 text-[13.5px] text-ink-muted">Predict what comes next. Act before it becomes a problem.</p>
        </Card>
      </div>

      <Sheet open={confirm !== null} onClose={() => setConfirm(null)} title={confirm === 'demo' ? 'Remove demo data?' : 'Reset this device’s store?'}
        footer={<div className="flex gap-2"><Button className="flex-1" onClick={() => setConfirm(null)}>Cancel</Button>
          <Button tone="danger" className="flex-1" busy={busy !== null} onClick={() => confirm === 'demo' ? run('demo', () => repo.clearDemo(), 'Demo data removed') : (resetLocalWorkspace(), location.reload())}>{confirm === 'demo' ? 'Remove demo data' : 'Reset'}</Button></div>}>
        <p className="text-[14px] text-ink-2">{confirm === 'demo' ? `This deletes the ${demoCount} demo products and their recommendations. Your own products are not touched.` : 'This deletes the store, products and history saved on this device.'}</p>
      </Sheet>
    </div>
  );
}
