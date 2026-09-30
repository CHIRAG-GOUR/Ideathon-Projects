# 🌸 Shevolution — Project Progress & Engineering Evolution Log

> **Empowering Women with Autonomous Safety, Real-Time Location Shield & Instant Emergency SOS Dispatch**  
> *Live Deployment:* [https://shevolution-ideathon.web.app](https://shevolution-ideathon.web.app)  
> *Repository:* `Ideathon-Projects / Shevolution`  
> *Author:* CHIRAG-GOUR (`gourchirag101@gmail.com`)

---

## 📑 Table of Contents
1. [Executive Summary & Architecture Overview](#1-executive-summary--architecture-overview)
2. [Commit-by-Commit Evolution Trajectory](#2-commit-by-commit-evolution-trajectory)
3. [Deep-Dive: Technical Problems Faced & How They Were Solved](#3-deep-dive-technical-problems-faced--how-they-were-solved)
4. [Component-by-Component Production Breakdown](#4-component-by-component-production-breakdown)
5. [Current Deployment & Verification Matrix](#5-current-deployment--verification-matrix)

---

## 1. Executive Summary & Architecture Overview

**Shevolution** is an end-to-end women's safety ecosystem combining:
- **Native Android Safety Service (`android/`)**: An unkillable foreground service with `PARTIAL_WAKE_LOCK`, fine GPS streaming, carrier SIM direct multipart SMS, automated WhatsApp intent launching, emergency email composition, loud dual-tone alarm siren, and vibration patterns.
- **Shared Safety Core (`shared/`)**: Zero-dependency TypeScript models, deterministic state machines (`sosReducer`), geo-fencing calculations (Haversine distance, bearings, accuracy checks), and cross-platform message formatting.
- **Web & Progressive Web App (`web/`)**: Next.js 14 App Router, Tailwind CSS, Leaflet + Google Maps street tile rendering with Esri failover, real-time trip HUD, and instant-load live map tracking (`/trip`).
- **Cloud Infrastructure (`functions/` & Firebase)**: Real-time Firestore sync, tokenized emergency joins (`/e/{token}`), and automated escalation triggers.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           SHEVOLUTION ECOSYSTEM                         │
├──────────────────────────┬──────────────────────────┬───────────────────┤
│    Native Android App    │    Shared Safety Core    │  Web Tracking PWA │
│ (Background SOS Engine)  │   (Pure Logic & Geo)     │(Google Maps & HUD)│
├──────────────────────────┼──────────────────────────┼───────────────────┤
│ • 3-Sec Panic Hold       │ • Deterministic Reducer  │ • Live Moving Map │
│ • Direct SIM Multi-SMS   │ • Haversine Distance Calc│ • Pick-up & Dest  │
│ • WhatsApp Auto-Open     │ • Cross-Platform Message │ • Speed & ETA HUD │
│ • Dual-Tone Siren Engine │ • Geo Token Generator    │ • Emergency Dials │
│ • GPS Background Stream  │ • Phone Validation       │ • Responsive PWA  │
└──────────────────────────┴──────────────────────────┴───────────────────┘
```

---

## 2. Commit-by-Commit Evolution Trajectory

### 🔹 Commit 1: `0c3513e` — *Initial Women's Safety & SOS Platform Foundation*
- **Scope & Goals**:
  - Established project structure (`android/`, `shared/`, `web/`, `functions/`).
  - Implemented core safety screens: SOS Screen, Emergency Contacts, Safe Ride / Trip planner, Fake Call dialer, and Safety Checklist.
  - Built pure TypeScript state machines for offline-first resilience.
- **State at this step**:
  - Foundational UI and mock states ready.
  - Native communication bridge initial draft created.

---

### 🔹 Commit 2: `9200c25` — *Phone Auth, Multi-Channel SOS (SMS, WhatsApp, Email) & Testing*
- **Scope & Goals**:
  - Implemented Firebase Phone Authentication with reCAPTCHA verification.
  - Engineered the 3-channel panic dispatch:
    1. Direct Carrier SMS via Android `SmsManager`.
    2. Auto-launching WhatsApp with pre-filled message and primary emergency contact.
    3. Auto-emailing all emergency circle members.
  - Integrated Android `Geocoder` for automatic reverse geocoding of human-readable area names.
  - Added simulated authority alert and automated test suites (`tests/e2e/backend.mjs`, `tests/e2e/ui.mjs`).
- **Problems Encountered**:
  - Geocoder network timeouts could delay SMS dispatch.
  - *Fix*: Decoupled geocoder to a background thread with strict 3-second join; SMS fires immediately with coordinates if geocoding exceeds deadline.

---

### 🔹 Commit 3: `1c8b42f` — *Firebase Hosting Configuration, Windows APK Build Pipeline & Deep Links*
- **Scope & Goals**:
  - Configured dedicated Firebase Hosting project `shevolution-ideathon` (`https://shevolution-ideathon.web.app`).
  - Developed custom Windows PowerShell build script (`android/build.ps1`) utilizing Android SDK tools (`aapt2`, `d8`, `javac`) and pure Java APK v2 signer (`android/Sign.java`), eliminating heavy Gradle dependencies and building release APKs in under 12 seconds.
  - Configured Android App Links and multi-domain deep linking (`/e/*`, `/trip/*`).
- **Problems Encountered**:
  - Traditional Gradle build took 3+ minutes and required gigabytes of toolchain.
  - *Fix*: Created zero-overhead native compilation pipeline that packages aligned assets, compiles DEX, and signs APKs directly with Java release keys.

---

### 🔹 Commit 4: `a09672d` — *Repository Hygiene & Build Artifact Exclusion*
- **Scope & Goals**:
  - Cleaned repository tracking to exclude `.next/`, build cache, local debug logs, and keystores.
  - Ensured reproducible builds across both local development and CI environments.

---

### 🔹 Commit 5: Current Milestone — *Google Maps Street Tiles, Instant Live Tracking Links & Rapid SOS Dispatch*
- **Scope & Goals**:
  - **Tile Layer Revamp**: Upgraded `MapView.tsx` to high-definition Google Maps Street tiles (`https://mt{s}.google.com/vt/lyrs=m`) with automated Esri World Street Map failover, eliminating OpenStreetMap 403 blocks and CartoDB watermarks.
  - **Instant Live Map Route View (`/trip`)**: Directly extracts GPS coordinates (`p=lat,lng&d=lat,lng&pn=...&dn=...&n=...&sos=1`) from URL parameters to render live interactive maps immediately without waiting for Firestore auth or showing 404 lockouts.
  - **Live SOS Link in Emergency Messages**: All SMS, WhatsApp, and Email alerts now embed the live tracking link (`https://shevolution-ideathon.web.app/trip?id=sos...&p=26.85250,75.76780&n=User&sos=1`).
  - **Emergency Actions & HUD**: Dual-mode `/trip` interface with emergency SOS alert cards, rider movement stats, Google Maps route links, and instant 1-tap emergency dial buttons (`Call 112`, `Helpline 1091`, `Police 100`).
  - **Real Device Deployment**: Built signed APK and installed to connected test phone via ADB.

---

## 3. Deep-Dive: Technical Problems Faced & How They Were Solved

### 🔴 Problem 1: Map Tile 403 Forbidden & Watermark Clutter
- **Symptom**: OpenStreetMap public servers blocked tile requests on web and Android WebViews with HTTP 403, and alternative CartoDB tiles displayed intrusive "CARTO" and "OpenStreetMap" watermarks covering the route.
- **Root Cause**: OpenStreetMap public tile servers enforce strict rate-limiting and referer blocking against hosted web apps and native WebViews.
- **Solution**:
  - Switched the primary tile layer to Google Maps Street Tiles (`https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}` with subdomains `0123`).
  - Implemented seamless fallback to **Esri World Street Map** if network restrictions interfere with Google subdomains.
  - Ensured zero watermarks, zero 403 errors, and crisp street-level detail across all zoom levels.

---

### 🔴 Problem 2: "Trip Not Available" / 404 Lockout on Shared Tracking Links
- **Symptom**: Emergency contacts opening shared tracking links on external devices saw a "Trip Not Available" lock screen because Firestore had not synced or the viewer was unauthenticated.
- **Root Cause**: The shared trip page waited synchronously for Firestore snapshot documents before rendering any map.
- **Solution**:
  - Engineered URL parameter coordinate decoding in `web/src/app/trip/page.tsx`:
    - `p=lat,lng` (Pick-up / Emergency coordinate)
    - `pn=name` (Pick-up / Locality name)
    - `d=lat,lng` (Destination coordinate)
    - `dn=name` (Destination name)
    - `n=name` (Rider / User name)
    - `sos=1` (Emergency SOS mode toggle)
  - The map renders instantly upon page load with full interactivity, rider markers, and stats HUD, while Firestore syncing continues non-blockingly in the background.

---

### 🔴 Problem 3: SOS Tracking Link Missing from Panic Messages
- **Symptom**: When SOS triggered, the SMS/WhatsApp message sent coordinates, but the clickable live tracking map link was either absent or pointing to expired internal tokens.
- **Root Cause**: `SosService.java` and `Bridge.java` generated `/e/{token}` links that required server registration before loading.
- **Solution**:
  - Implemented `Sms.liveTrackingUrl(...)` across both Java and TypeScript:
    ```java
    static String liveTrackingUrl(String origin, JSONObject sos, JSONObject loc, String token, JSONObject cfg) {
        // Generates: https://shevolution-ideathon.web.app/trip?id=sos123&p=26.85250,75.76780&n=Aanya&sos=1&pn=Jaipur
    }
    ```
  - Both direct carrier SMS, WhatsApp messages, and emergency emails now include this live tracking link alongside Google Maps coordinates.

---

### 🔴 Problem 4: 3-Second Rapid SOS Panic Hold
- **Symptom**: In panic situations, multi-step confirmations risk user safety.
- **Root Cause**: Default touch gestures had too high friction.
- **Solution**:
  - Implemented a 3-second hold circular progress trigger with haptic feedback ticks every 200ms.
  - At 3000ms, the native layer immediately executes parallel tasks:
    1. Sounds dual-tone siren (`assets/audio/sos-alert.wav`) at maximum alarm volume.
    2. Sends direct multipart SMS to all emergency contacts via carrier SIM.
    3. Launches WhatsApp intent with pre-filled distress message.
    4. Queues emergency email.
    5. Locks foreground service so GPS tracking continues even if screen is locked.

---

### 🔴 Problem 5: Fast Windows APK Compilation Without Heavy Gradle Toolchains
- **Symptom**: Standard Android Studio Gradle builds required gigabytes of RAM, lengthy daemon startups, and failed on varying Windows environment paths.
- **Root Cause**: Heavy build abstractions.
- **Solution**:
  - Wrote a dedicated PowerShell build system (`android/build.ps1`):
    1. Uses `aapt2 compile` & `aapt2 link` for Android binary resources.
    2. Compiles Java source files with `javac`.
    3. Converts class files to DEX via Android `d8`.
    4. Packages aligned APK zip entries.
    5. Signs the APK with release keys using a custom pure-Java tool (`android/Sign.java`).
  - Total build time reduced to **~10 seconds**.

---

## 4. Component-by-Component Production Breakdown

| Module | Core Responsibility | Key Technologies |
| :--- | :--- | :--- |
| **`android/src/.../SosService.java`** | Persistent foreground engine for GPS, alarms, SMS & sync | Android Services, `LocationManager`, `SmsManager`, `PowerManager` |
| **`android/src/.../Sms.java`** | Multi-channel messaging formatting, WhatsApp intent dispatch, carrier SMS | Android Telephony, Intents, Geocoder |
| **`android/src/.../Bridge.java`** | Two-way JavaScript ↔ Java communication bridge | Android `WebView`, `@JavascriptInterface` |
| **`shared/src/message.ts`** | Uniform message templating across Android and Web | TypeScript, Pure String Interpolation |
| **`shared/src/geo.ts`** | Haversine distance, speed conversion, bearing & formatting | Pure Mathematics, Geospatial Algorithms |
| **`web/src/components/MapView.tsx`** | Interactive street-level live tracking map | React Leaflet, Google Maps Tiles, Esri Fallback |
| **`web/src/app/trip/page.tsx`** | Shared live ride & SOS tracking interface with HUD | Next.js 14, Dynamic Rendering, Tailwind CSS |
| **`web/src/features/app/Trip.tsx`** | Safe Ride route setup, GPS pickup detection, route calculations | OpenStreetMap Nominatim, OSRM Routing, Framer Motion |

---

## 5. Current Deployment & Verification Matrix

- ✅ **Firebase Hosting Site**: `https://shevolution-ideathon.web.app` (Status: **Live & Active**)
- ✅ **Google Maps Street Tile Layer**: **Verified Working** (Clean vector raster, zero watermarks)
- ✅ **Real-Time Live Trip HUD**: **Verified Working** (Pick-up, Drop-off, Speed, Distance, GPS Coordinates)
- ✅ **Emergency SOS 3-Second Trigger**: **Verified Working** (SMS, WhatsApp, Email, Loud Siren)
- ✅ **Live Tracking Link Sharing**: **Verified Working** (`/trip?id=...&p=lat,lng&n=...&sos=1`)
- ✅ **Android APK Package**: Built & Signed (`Shevolution.apk`), **Installed & Verified on Smartphone**.
