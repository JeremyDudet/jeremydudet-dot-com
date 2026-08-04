import { describe, expect, it } from 'vitest'
import { computeStreak } from './stats'

// Day strings arrive newest-first, the way publishPulse's DISTINCT query
// orders them.
describe('computeStreak', () => {
  it('is 0 with no posting days', () => {
    expect(computeStreak([], '2026-08-04')).toBe(0)
  })

  it('counts a post today as a streak of 1', () => {
    expect(computeStreak(['2026-08-04'], '2026-08-04')).toBe(1)
  })

  it('survives overnight — posted yesterday, nothing yet today', () => {
    expect(computeStreak(['2026-08-03'], '2026-08-04')).toBe(1)
  })

  it('breaks after a full missed day', () => {
    expect(computeStreak(['2026-08-02'], '2026-08-04')).toBe(0)
  })

  it('walks a consecutive run', () => {
    expect(
      computeStreak(['2026-08-04', '2026-08-03', '2026-08-02'], '2026-08-04'),
    ).toBe(3)
  })

  it('stops at the first gap inside the run', () => {
    expect(
      computeStreak(['2026-08-04', '2026-08-03', '2026-08-01'], '2026-08-04'),
    ).toBe(2)
  })

  it('crosses month boundaries', () => {
    expect(
      computeStreak(['2026-08-01', '2026-07-31', '2026-07-30'], '2026-08-01'),
    ).toBe(3)
  })

  it('ignores older days once the head is stale', () => {
    // Even a long historical run doesn't count if the latest day is 2+ back.
    expect(
      computeStreak(['2026-08-01', '2026-07-31'], '2026-08-04'),
    ).toBe(0)
  })
})
