'use client';
/** EMERGENCY SERVICES — ambulance, police, fire & rescue. Configurable numbers; the phone dials, nothing is dispatched by the app. */
import { useApp } from '@/ctx';
import { Btn, Kicker, Panel } from '@/ui/kit';
import { Page, PageTitle } from '@/components/lifeline/LifeLineShell';
import { EmergencyServicesList } from '@/components/lifeline/EmergencyServices';

export function ServicesScreen() {
  const { region, nav } = useApp();
  return (
    <Page>
      <PageTitle kicker="Emergency services" title="Ambulance. Police. Fire & rescue." sub={`Official numbers for ${region.name}. Change any number in Settings if your area uses a different line.`} tone="coral" right={<Btn tone="white" icon="settings" onClick={() => nav.tab('settings')}>Configure numbers</Btn>} />
      <EmergencyServicesList />
      <Panel className="mt-4 p-5">
        <Kicker>What LifeLine Hub does — and doesn’t</Kicker>
        <ul className="mt-3 grid grid-cols-1 gap-2 text-[13.5px] text-ink-soft sm:grid-cols-2">
          <li className="rounded-2xl bg-vital-50 p-3"><b className="text-vital-600">Does:</b> dial these numbers on your phone, alert your emergency contacts, share your live location, and show nearby hospitals and police.</li>
          <li className="rounded-2xl bg-amber-50 p-3"><b className="text-amber-700">Doesn’t:</b> dispatch ambulances or police, or send your SOS to any control room. No integration with an emergency dispatch system exists in this build.</li>
        </ul>
        {region.primary.note && <p className="mt-3 text-[12.5px] text-ink-muted">{region.primary.label} {region.primary.number}: {region.primary.note}</p>}
      </Panel>
    </Page>
  );
}
