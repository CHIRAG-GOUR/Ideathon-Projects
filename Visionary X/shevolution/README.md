# Shevolution

A women's safety app: hold SOS for 3 seconds to alert the people you trust with your precise location.

It is a separate app on the `ideathon-projects` Firebase project:

- **Hosting site:** `shevolution` → **https://shevolution.web.app**
- **Firestore database:** `shevolution` (named)
- **Cloud Functions codebase:** `shevolution` (`asia-south1`)

Other apps on the project are untouched.

| Part | What it is |
|---|---|
| `android/` | The Android app, `Shevolution.apk`. A native Java safety layer, plus the React UI bundled inside the APK so it opens with no internet. |
| `web/` | Next.js (static) + Framer Motion, red & white. It is the website, the contact live-location page (`/e/<link>`), the invitation page (`/join/<link>`) and the dashboard. The same build is the in-app UI. |
| `functions/` | The API behind `/api/**`: SOS sync, SMS fallback, live links, contacts, trips, check-ins, retention, delete account. |
| `shared/` | Types, message templates, the SOS state machine and emergency numbers, used by all of the above. |

## What happens when SOS is held for 3 seconds

A tap or an early release does nothing and shows "SOS cancelled".

After a 3-second hold, the phone does all of the following at once. None of it waits for the internet.

1. **Siren and vibration:** the siren (`assets/audio/sos-alert.wav`) plays and the phone vibrates. The screen switches to SOS ACTIVE.
2. **Location:** GPS, network and fused location are used at the same time. The phone waits up to 8 s for a fix within ±25 m, otherwise it uses the best one available. Latitude, longitude, accuracy, time and the approximate area/address are shown.
3. **SMS:** an SMS goes from the user's own number to every contact, automatically. It reads:
   - "🆘 SOS! I NEED HELP!"
   - Map link, latitude/longitude with accuracy, and area.
   - Time.
   - A personal live-location link for verified contacts.

   The screen shows "SMS SENT" only after the carrier accepts it, and "DELIVERED" only after a delivery report.
4. **WhatsApp:** it opens to the primary contact with the same message. WhatsApp requires the user to tap Send; nothing can send it automatically.
5. **More WhatsApp and email:** the SOS screen has one-tap buttons to WhatsApp other contacts and to email everyone from the user's own email app.
6. **Nearest police and army:** a panel shows the nearest police stations and army camps and animates "SOS SENT". It uses real places and distances from OpenStreetMap. It is a **SIMULATION**, labelled on screen: nothing is sent to police or the army, and there is no backend integration. "Call 112" opens the real dialer.
7. **Live location:** it keeps updating every 5–30 s, slower when you are still. This runs in a foreground service with the notification "Shevolution is sharing your location", so it continues when the screen is locked.
8. **Offline:** everything is queued on the phone and syncs automatically when the network returns.
9. **Ending SOS:** it needs another 3-second hold, then "Are you safe?". Sharing stops immediately, and contacts are told the outcome.

## Sign up and login

Sign-up and login use the **mobile number** with a one-time SMS code (Firebase Phone Auth).

Contacts verify their own number through an invitation link before they can open anyone's live location.

## Deploy (from this folder, on your PC)

1. **Firebase console (one time), project `ideathon-projects`:**
   - It must be on the **Blaze** plan.
   - Authentication → Sign-in method → turn on **Phone** and **Anonymous**. Anonymous is used by the live-location link.
   - Authentication → Settings → Authorized domains → add **`shevolution.web.app`**.
   - The project needs at least one **Web app** (Project settings → Your apps). The site reads its public config from `/__/firebase/init.json`, so no keys go into the code.
2. **One time:**
   ```
   npm install
   npm --prefix web install
   npm --prefix functions install
   npm run firebase:setup
   ```
   This creates the `shevolution` database and the `shevolution` hosting site, and stores the SMS-provider secret as `none`.
3. **Deploy:**
   ```
   npm run deploy
   ```
   This builds the web app and functions, then deploys only `hosting:shevolution`, `functions:shevolution` and `firestore:shevolution`. The site is at https://shevolution.web.app, and the APK downloads from https://shevolution.web.app/download/Shevolution.apk.
4. **Optional:** a server-side SMS fallback for when the phone has internet but can't text:
   ```
   npx firebase-tools functions:secrets:set SHEVOLUTION_SMS
   ```
   Give it this JSON:
   ```
   {"provider":"twilio","accountSid":"AC…","authToken":"…","from":"+1…"}
   ```
   For India, the sender must be DLT-registered with your provider.

## Android app

- **Install:** copy `Shevolution.apk` to the phone and allow "Install unknown apps". Give it Location, Notifications and SMS when asked; each permission is explained first.
- **Rebuild:**
  ```
  npm --prefix web run build
  bash android/build.sh
  ```
  It needs a JDK and Python and downloads the tools itself. `FLAVOR=play` builds without SMS permissions.
- **Signing key:** keep `android/keystore/` private and safe. Updates must be signed with the same key.

**Google Play:** `SEND_SMS` and `RECEIVE_SMS` are restricted permissions. A Play release needs the Permissions Declaration Form (safety/emergency use), or the `play` flavor, where SOS texts open the Messages app. The APK here is for direct install, so it can send SMS itself.

## Test

- Unit tests (`npm test`) cover:
  - The state machine.
  - The message text (the Java and TypeScript versions are checked to be identical).
  - Emergency numbers.
  - SMS provider rules.
- Emulator tests (`tests/e2e`) need the Firebase emulators with `--project demo-shevolution` and `node tests/fake-services.mjs`:
  - `backend.mjs` checks security rules, the SMS fallback, live-link access and revocation, responders, chat, and delete account.
  - `scheduled.mts` checks trip escalation and retention.
  - `ui.mjs` checks the live view and the in-app SOS flow through a mock of the Android bridge.
- **Test on a real phone before relying on it:**
  - Screen locked.
  - Offline.
  - No SMS permission.
  - WhatsApp not installed.
  - Location off.

  This container has no Android device or emulator.

## Limits to know

- **WhatsApp and email:** they open ready to send; the user taps Send.
- **Police, army and 112:** this is a simulation only. Real help is "Call 112".
- **Maps:** OpenStreetMap tiles and data need internet; coordinates always show.
- **Push notifications:** there are no Firebase push notifications (Google's SDK repository was unreachable from this build machine). Contacts who have Shevolution get a loud SOS alarm when the SOS text arrives. Everyone else gets the text itself.
