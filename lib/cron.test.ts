import { describe, expect, it } from 'vitest'
import { due } from './cron'

// All dates constructed in UTC because due() reads getUTCDay/getUTCDate —
// the cron fires at 14:00 UTC and cadences are defined against that clock.
const utc = (y: number, m: number, d: number) => new Date(Date.UTC(y, m - 1, d))

describe('due', () => {
  it('always includes daily', () => {
    // Tuesday the 4th — neither weekly nor monthly triggers.
    expect(due(utc(2026, 8, 4))).toEqual(['daily'])
  })

  it('adds weekly on Mondays', () => {
    // Monday 2026-08-03.
    expect(due(utc(2026, 8, 3))).toEqual(['daily', 'weekly'])
  })

  it('adds monthly on the 1st', () => {
    // Saturday 2026-08-01.
    expect(due(utc(2026, 8, 1))).toEqual(['daily', 'monthly'])
  })

  it('fires all three on a Monday the 1st', () => {
    // Monday 2026-06-01.
    expect(due(utc(2026, 6, 1))).toEqual(['daily', 'weekly', 'monthly'])
  })

  it('does not add weekly on other weekdays', () => {
    // Sunday 2026-08-02 — day 0 in getUTCDay, not Monday's 1.
    expect(due(utc(2026, 8, 2))).toEqual(['daily'])
  })
})
