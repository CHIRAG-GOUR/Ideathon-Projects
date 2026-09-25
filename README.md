# Visionary X — Smart Grocery Inventory & Waste Prevention Platform

> **Simple, Interactive School & College Project Demonstration**  
> **Core Concept:** SCAN ➔ UNDERSTAND ➔ ORGANIZE ➔ REDUCE WASTE

Visionary X is a friendly smart grocery shop assistant built for live student demonstrations to teachers and judges. It demonstrates how machine-readable barcodes, real-time shelf-life tracking, and intelligent shelf organization can eliminate grocery food waste.

---

## 🌟 Key Features

1. **📷 Real Barcode Scanning (`/scan`)**
   - Live camera barcode decoding using `@zxing/browser` & `getUserMedia` with back/environment camera preference.
   - Immediate detection of Code-128 & EAN barcodes with audio feedback.
   - Instant product recognition card showing units, days to expiry, urgency status (🔴 *Sell First*, 🟡 *Sell Soon*, 🟢 *Fresh*), and smart placement advice.
   - Quick fallback buttons and manual numeric input for testing without a webcam.

2. **🏬 Interactive Warehouse & Organization Game (`/warehouse`)**
   - **2D Mode:** 3 color-coded freshness shelves (🔴 SELL FIRST, 🟡 SELL SOON, 🟢 FRESH STORAGE) with drag/click organization.
   - **3D Mode:** Low-poly 3D warehouse room powered by React Three Fiber & Three.js with illuminated shelf bays and real-time box positioning.
   - **Gamification:** +50 pts for scanning, +100 pts for correct placement, +500 completion bonus with victory confetti and total waste prevented calculations (₹1,250).

3. **📦 My Stock Overview (`/stock`)**
   - Clean, light-themed grid of all 6 products with visual urgency badges and quick details modal.

4. **🖨️ Printable Demo Barcodes Sheet (`/barcodes`)**
   - Real machine-readable Code-128 SVG barcodes generated dynamically via `jsbarcode`.
   - Print individual or entire cut-out sheets to tape onto real bottles, packets, and boxes for live physical demonstrations.

5. **💡 Demo Mode & Presentation Guide**
   - 5-step teacher presentation modal with quick reset button for repeated demonstrations.

---

## 🥛 Demo Product Dataset

All screens derive from a single source of truth (`src/lib/products.ts`):

| Product | Barcode | Category | Units | Shelf Life | Priority Shelf |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **🥛 Milk** | `890000000001` | Dairy | 42 | 2 days | 🔴 SELL FIRST |
| **🍞 Bread** | `890000000002` | Bakery | 18 | 4 days | 🟡 SELL SOON |
| **🍪 Biscuits** | `890000000003` | Snacks | 35 | 30 days | 🟢 FRESH STORAGE |
| **🧃 Juice** | `890000000004` | Beverages | 22 | 12 days | 🟢 FRESH STORAGE |
| **🧀 Paneer** | `890000000005` | Dairy | 16 | 1 day | 🔴 SELL FIRST |
| **🍚 Rice** | `890000000006` | Staples | 50 | 180 days | 🟢 FRESH STORAGE |

---

## 🚀 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Run Locally
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🛠️ Technology Stack
- **Framework:** Next.js 14 (App Router)
- **UI & Styling:** React 18, Tailwind CSS, Lucide Icons, Framer Motion
- **3D Graphics:** Three.js, React Three Fiber, React Three Drei
- **State Management:** Zustand
- **Barcode Engine:** `@zxing/browser` (camera decoding) + `jsbarcode` (SVG generation)
- **Sound:** Web Audio API procedural synthesizers
