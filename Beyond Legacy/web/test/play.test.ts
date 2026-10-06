import { describe, expect, it } from 'vitest';
import { aiPlan, habitPlan, newWeek, playDay, totals, type Plan, type SimState } from '../src/play/sim';

const run = (policy: (s: SimState) => Plan) => {
  let s = newWeek();
  while (!s.done) s = playDay(s, policy(s));
  return totals(s);
};

describe('Shelf Rush simulation', () => {
  it('is deterministic', () => {
    expect(run(habitPlan)).toEqual(run(habitPlan));
  });
  it('the engine-guided week beats the habit week on losses', () => {
    const habit = run(habitPlan), ai = run(aiPlan);
    expect(ai.lostSales + ai.wastedValue).toBeLessThan(habit.lostSales + habit.wastedValue);
    expect(ai.profit).toBeGreaterThan(habit.profit);
  });
});
