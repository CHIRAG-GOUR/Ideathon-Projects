import Link from 'next/link';
import { Logo } from '@/components/ui';

export const metadata = { title: 'Privacy — Shevolution' };

const SECTIONS: { title: string; body: string[] }[] = [
  {
    title: 'Location',
    body: [
      'Your location is read only when you ask for it: when you hold SOS, during a Safe Trip, for Nearby Help, or when you add your location to a check-in.',
      'During an SOS the phone records latitude, longitude, accuracy, and — when available — altitude, speed and heading, every 5–30 seconds (your setting; less often when you are not moving). Nothing is guessed: if no fresh fix is possible you see "Last known location" or "Location unavailable".',
      'Location is never used for advertising and is never sold.',
    ],
  },
  {
    title: 'Background location',
    body: [
      'Shevolution collects location data to enable live emergency location sharing and Safe Trips even when the app is closed or not in use — but only while an SOS or trip you started is running.',
      'This uses an Android foreground service that shows a persistent notification ("Shevolution is sharing your location") the whole time, and stops the moment the SOS or trip ends. Shevolution does not request the "allow all the time" background-location permission.',
    ],
  },
  {
    title: 'Live location links',
    body: [
      'Each verified contact gets their own random link (for example …/e/r_8FJ2k…). The link contains no name, phone number, user ID or coordinates.',
      'A link works only while the SOS is active, for at most 24 hours, and only for a contact who is still in your Safety Circle and has verified their phone number or email. Ending the SOS or removing the contact cuts access immediately.',
    ],
  },
  {
    title: 'Emergency contacts',
    body: [
      'You add contacts one by one, or pick a single contact with Android’s contact picker. Only the name, number/email and relationship you save are stored — your address book is never uploaded.',
      'Before a contact can see live location, they must verify the phone number (one-time code) or email address you entered. Changing the number removes their verification.',
    ],
  },
  {
    title: 'SMS',
    body: [
      'When you hold SOS, the Android app texts your chosen contacts from your own SIM, so it works without internet. It only sends the SOS, update, escalation, check-in and trip messages you set up. It never reads, stores or uploads your messages.',
      'If your phone cannot send a text but has internet, the server may send it through an SMS provider (if one is configured). The app records "sent" only when the carrier or provider accepted the message, and "delivered" only when a delivery report confirms it.',
      'An SMS cannot play a custom sound on someone else’s phone. If a contact has Shevolution and turned on "SOS alerts from your circle", their app recognises a Shevolution SOS text and rings with the SOS sound. That check happens on their phone; the text is not uploaded.',
    ],
  },
  {
    title: 'Notifications',
    body: [
      'Notifications are shown by the app on your phone: location-sharing status, trip reminders ("Are you safe?") and SOS alerts from your circle (SOS channel with its own sound). Shevolution does not use a push-notification service in this version.',
    ],
  },
  {
    title: 'Emergency event storage',
    body: [
      'An SOS is saved on your phone first, then synced to Shevolution’s own database (Google Cloud Firestore, Mumbai region) when there is a connection: start and end time, status, location trail, which contacts were texted and whether it succeeded, who responded, and emergency chat.',
      'Emergency profile details (age, blood group, allergies, notes) are optional and attached to an SOS only if you turn sharing on.',
    ],
  },
  {
    title: 'Data retention',
    body: [
      'While an SOS is active, the full location trail is kept. After it ends, the precise trail, chat and responder positions are deleted after your retention period (1, 7, 30 or 90 days — default 30). A short summary remains until you delete it.',
      'An SOS that is never ended is closed automatically after 48 hours. Live links expire after 24 hours at most.',
      'Delete history (Settings) removes ended SOS events, trips and check-ins. Delete account removes everything, revokes every link and device key, and unlinks you from other people’s circles.',
    ],
  },
  {
    title: 'Authorities',
    body: [
      'Shevolution has no official data connection to 112, the police or the army. The "nearest police & army" panel on the SOS screen is a SIMULATION in this version — nothing is sent to them. "Call 112" opens your phone’s dialer.',
    ],
  },
  {
    title: 'Third-party services',
    body: [
      'Google Firebase (sign-in, database, server functions). OpenStreetMap: map tiles, Nominatim (address and place search), Overpass (nearby police/hospitals) and OSM routing (walking routes) — these receive the coordinates needed to answer each request, from your device. An SMS provider only if the operator configures one.',
    ],
  },
];

export default function Privacy() {
  return (
    <div className="min-h-screen bg-paper">
      <header className="page flex h-20 items-center">
        <Link href="/"><Logo /></Link>
      </header>
      <main className="page max-w-3xl pb-20">
        <p className="h-eyebrow">Privacy</p>
        <h1 className="mt-3 text-4xl font-extrabold tracking-tight">What Shevolution collects, and why</h1>
        <p className="mt-4 text-lg text-ink-soft">Only what a safety feature needs, only while it needs it, and never for ads.</p>
        <div className="mt-10 space-y-6">
          {SECTIONS.map((s) => (
            <section key={s.title} className="rounded-4xl border border-line bg-white p-6 shadow-soft">
              <h2 className="text-xl font-extrabold">{s.title}</h2>
              {s.body.map((p) => (
                <p key={p.slice(0, 24)} className="mt-3 text-ink-soft">{p}</p>
              ))}
            </section>
          ))}
        </div>
      </main>
    </div>
  );
}
