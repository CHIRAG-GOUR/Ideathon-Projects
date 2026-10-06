# Demo script (≈4 minutes)

1. **Open** https://beyond-legacy-app.web.app (or the Android app). Create an account → store setup → tick
   *Start with sample products* → **Create store**.
2. **Overview.** "Inventory Health 62% — 29 of 47 products need nothing today." Point at the strips: restock, expiry,
   slow. The aisle illustration shows where the problems sit.
3. **Next Move.** "Of everything in the store, this is the one thing to do now." Tap **Review reasoning** →
   WHAT / WHY / WHEN / IF IGNORED. Every number is shown — no black box.
4. **Live analysis.** Inventory → search *Cold Coffee*. Stock 18, demand 8/day, safety 10 → *monitor*.
   Drag stock to **6** → watch Data → Analyse → Predict → Action flip to **RESTOCK 30 units**, the forecast line drop
   below safety and the stock-out marker appear. **Save as stock count**.
5. **Act.** Tap **Mark ordered** → the button turns into *✓ Ordered*. The move leaves the queue and stays handled
   until a delivery raises stock. Reload the page — it is all still there (Firestore).
6. **Next Moves board.** NOW / TODAY / WATCH. Then **Insights → Expiry**: the "sell first" shelf (what to discount
   before it spoils, with value at risk) and **Slow**: the quiet shelf (cash tied up in stock that isn't moving).
7. **Close.** "Stock, sales, expiry, product → prediction, risk → one ordered list of actions. Web and Android, one
   Firebase backend, every decision explainable."
