# Recommendation engine

Pure TypeScript in `web/src/engine/` — deterministic (same data → same answer), explainable (every output carries
its reasons), runs on the device, unit-tested. No machine-learning model and no randomness.

## Thresholds (Store → Engine settings)

| Setting | Default | Meaning |
|---|---|---|
| `highRiskDays` | 2 | cover below this → HIGH stock-out risk |
| `reorderWindowDays` | 4 | cover below this → MEDIUM (monitor) |
| `orderCoverageDays` | 3 | a suggested order covers this many days + safety stock |
| `slowCoverageDays` | 14 | cover at or above this → slow stock |
| `expiryWatchDays` | 7 | expiry within this window is analysed |

## 1. Demand
`daily` = average units/day over the **last 7 complete days** (today excluded). Days before `trackingSince` are
unknown, later missing days are zero sales. With fewer than 7 days it blends with the owner's declared estimate:
`w·sales + (1−w)·declared`, `w = days/7`. **Trend**: last 7 vs prior 7 days (≥3 days needed); ±10% → up / down.

## 2. Predict
- **Cover** = stock ÷ daily demand (days).
- **Stock-out risk**: HIGH if stock ≤ 0, cover < `highRiskDays`, or stock ≤ safety stock; MEDIUM if cover <
  `reorderWindowDays`; else LOW (NONE if no demand).
- **Expiry risk**: expected sold before expiry = demand × (days to expiry + 1); unsold = stock − that.
  Expired → EXPIRED. Within `expiryWatchDays`: HIGH if ≤ 2 days left and unsold ≥ max(2, 15% of stock); MEDIUM if any
  unsold; else LOW.
- **Slow**: cover ≥ `slowCoverageDays`, or no sales in the last 7 days with stock on hand.
- **Forecast**: projected stock for the next 8 days, with the stock-out day and expiry marked.

## 3. Act (first rule that applies)
| Condition | Action | Bucket | Priority |
|---|---|---|---|
| expired stock | REMOVE | NOW | 100 |
| expiry HIGH / MEDIUM | SELL SOON (discount, move to front) | NOW if ≤1 day & HIGH, else TODAY | 60–92 / 40–65 |
| stock-out HIGH | RESTOCK `order` units | NOW | 80–99 (lower cover, zero stock, rising trend → higher) |
| stock-out MEDIUM | HOLD — monitor, reorder point near | WATCH | 25–45 |
| slow | HOLD — don't reorder | WATCH | 15–25 |
| otherwise | HOLD — healthy | WATCH | 0 |

**Order quantity** = ⌈daily × `orderCoverageDays` + safety − stock⌉, rounded **up to whole cases** (min one case).
Example: Cold Coffee, demand 8, safety 10, stock 6 → 8×3+10−6 = 28 → case of 6 → **30 units**.

Each recommendation carries `headline`, `reasons[]` (WHY, with the numbers), `when`, `ifIgnored`, `impact` and
`valueAtRisk` (₹) — the explanation sheet renders exactly these.

## 4. Next Move queue
Open NOW + TODAY actions sorted by priority, then value at risk, then name. The first is the **Next Move**.

## 5. Handled actions
The manager's response is stored in `recommendations/{productId}` and suppresses the move only while it is still true:
*ordered* → until stock rises above the stock at the time of ordering (delivery received); *prioritised* → until the
expiry date changes; *removed* → while stock and expiry are unchanged; *acknowledged* → 7 days.

## 6. Inventory Health %
Healthy products ÷ all products, where healthy = no HIGH stock-out risk, no expiry flag and not slow.

## Acceptance case (unit + e2e tested)
Cold Coffee stock 18, demand 8/day, safety 10 → cover 2.25 days → MEDIUM, HOLD (monitor).
Stock 6 → cover 0.75 days and below safety → **HIGH, RESTOCK 30**, "stock-out in 0.8 days".
