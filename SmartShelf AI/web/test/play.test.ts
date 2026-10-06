import { describe, expect, it } from 'vitest';
import { playDay, requestRestock, runToEnd, startLive, stepLive, type WorkerPolicy } from '../src/play/live';
import { aiPlan, habitPlan, newWeek, totals, type Plan, type SimState } from '../src/play/sim';

const run = (policy: (s: SimState) => Plan, worker: WorkerPolicy) => {
  let s = newWeek();
  while (!s.done) s = playDay(s, policy(s), worker);
  return totals(s);
};

describe('Shelf Rush simulation', () => {
  it('is deterministic', () => {
    expect(run(habitPlan, 'habit')).toEqual(run(habitPlan, 'habit'));
  });
  it('the engine-guided week beats the habit week on losses', () => {
    const habit = run(habitPlan, 'habit'), ai = run(aiPlan, 'smart');
    expect(ai.lostSales + ai.wastedValue).toBeLessThan(habit.lostSales + habit.wastedValue);
    expect(ai.profit).toBeGreaterThan(habit.profit);
  });
});

describe('Shelf Rush live day', () => {
  it('the worker restocks a shelf when the player asks, oldest date in front', () => {
    const s = newWeek();
    const L = startLive(s, habitPlan(s), 'player');
    for (let i = 0; i < 400; i++) stepLive(L, 0.05);
    expect(requestRestock(L, 'milk')).toBe(true);
    for (let i = 0; i < 600; i++) stepLive(L, 0.05);
    expect(L.events.some((e) => e.kind === 'restock' && e.item === 'milk')).toBe(true);
    const dates = L.items.milk.shelf.map((b) => b.expiresDay ?? 99);
    expect([...dates].sort((a, b) => a - b)).toEqual(dates); // FIFO: front of the shelf expires first
  });
  it('every customer leaves and the day closes', () => {
    const s = newWeek();
    const L = runToEnd(startLive(s, habitPlan(s), 'habit'));
    expect(L.ended).toBe(true);
    expect(L.customers.every((c) => c.phase === 'gone')).toBe(true);
  });
});
