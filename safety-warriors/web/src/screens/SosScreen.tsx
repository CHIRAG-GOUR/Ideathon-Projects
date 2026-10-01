'use client';
import { Header, Page, useApp } from '@/ctx';
import { Card, Kicker } from '@/ui/kit';
import { SosBadge } from '@/ui/art';
import { Icon } from '@/ui/icons';

export function SosScreen() {
  const { startSos, contacts, region, run } = useApp();
  return (
    <>
      <Header title="SOS" sub="Hold to alert your trusted contacts" back />
      <Page>
        <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
          <Card className="flex flex-col items-center !p-6 text-center">
            <SosBadge size={250} onComplete={() => startSos('sos')} />
            <p className="mt-2 max-w-sm text-sm text-ink-muted">Release before 3 seconds to cancel. {contacts.length ? `Alerts ${contacts.length} contact${contacts.length > 1 ? 's' : ''}.` : 'No trusted contacts yet — add one so SOS reaches someone.'}</p>
            <div className="mt-6 flex w-full max-w-sm items-center gap-4 rounded-3xl bg-indigo-50 p-4 text-left">
              <SosBadge size={96} tone="indigo" label="SILENT" sub="Hold 3 s" onComplete={() => startSos('discreet')} />
              <p className="text-sm text-ink-soft"><b>Silent SOS</b> — no siren, no sound. Contacts are texted that you may not be able to talk.</p>
            </div>
          </Card>
          <div className="space-y-4">
            <Card>
              <Kicker>When you hold SOS</Kicker>
              <ol className="mt-3 space-y-2.5 text-sm text-ink-soft">
                {[
                  ['Siren and vibration start', 'Unless you chose Silent SOS.'],
                  ['Your location is found', 'Precise when GPS allows; otherwise shown as approximate or last known.'],
                  ['Your contacts are alerted', 'Android app: SMS from your SIM automatically. WhatsApp and email open ready to send.'],
                  ['A private live link is shared', 'Each contact gets their own link; it stops working when the SOS ends.'],
                  ['Everything is recorded', 'In your Emergency History, including what failed.'],
                ].map(([t, d], i) => (
                  <li key={t} className="flex gap-3">
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-teal-500 font-display text-xs font-bold text-white">{i + 1}</span>
                    <span><b className="text-ink">{t}.</b> {d}</span>
                  </li>
                ))}
              </ol>
            </Card>
            <Card>
              <button onClick={() => run({ kind: 'call', line: 'emergency' })} className="flex w-full items-center gap-3 text-left">
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-sos-500 text-white"><Icon name="phone" /></span>
                <span><span className="block font-display text-xl font-bold text-indigo-800">Call {region.primary.number}</span><span className="text-sm text-ink-muted">Safety Warriors does not contact emergency services for you.</span></span>
              </button>
            </Card>
          </div>
        </div>
      </Page>
    </>
  );
}
