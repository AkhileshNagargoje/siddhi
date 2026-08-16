// Unit tests for the detection decision — the one piece of maths the whole
// product hangs on. Pure function, no database, no mocks.
//
//   cd worker && node --test
//
// Each case states the epidemiological intent, not just the numbers, so a
// failure reads as "the system would now cry wolf" rather than "3.71 != 3.70".

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { scoreCell } from '../src/index.js'

const close = (a, b) => Math.abs(a - b) < 0.01

test('empty baseline: z degenerates to the raw count, only MIN_COUNT protects us', () => {
  const r = scoreCell(8, [0, 0, 0])
  assert.ok(close(r.z, 8), `z should be 8.00, got ${r.z}`)
  assert.equal(r.tier, 'act') // fires — a brand-new signal in a silent cell is worth acting on
})

test('below the count floor nothing fires, however extreme the ratio', () => {
  // 7 cases where none were expected is a 7-sigma event on paper —
  // but 7 < MIN_COUNT, and small numbers must never page a crew.
  assert.equal(scoreCell(7, [0, 0, 0]).tier, null)
  assert.equal(scoreCell(2, [0, 0, 1]).tier, null)
})

test('thin baseline: the Poisson floor demotes a screaming act to a watch', () => {
  // Raw stddev of [2,3,2] is 0.47 -> z would be 12 and page a crew off
  // 8 cases against a baseline of ~2. The sqrt(mean) floor makes it 3.71.
  const r = scoreCell(8, [2, 3, 2])
  assert.ok(close(r.z, 3.71), `z should be 3.71, got ${r.z}`)
  assert.equal(r.tier, 'watch')
})

test('the demo outbreak: 43 against ~9 expected is unambiguous', () => {
  const r = scoreCell(43, [9, 8, 9])
  assert.ok(close(r.z, 11.66), `z should be 11.66, got ${r.z}`)
  assert.equal(r.tier, 'act')
})

test('identical history: stddev=0 must not fabricate certainty', () => {
  // Three identical days are COMMON at low rates. Raw stddev is 0, so
  // without the floor 12-vs-5 would be a 7-sigma act alert.
  const r = scoreCell(12, [5, 5, 5])
  assert.ok(close(r.z, 3.13), `z should be 3.13, got ${r.z}`)
  assert.equal(r.tier, 'watch')
})

test('an ordinary day never alerts', () => {
  assert.equal(scoreCell(9, [8, 9, 10]).tier, null)   // dead on baseline
  assert.equal(scoreCell(12, [8, 9, 10]).tier, null)  // slightly busy, z ~ 1
})

test('one noisy historical day desensitises the cell (known, accepted trade)', () => {
  // hist [1,10,1]: stddev 4.24 dominates the floor, so 14 observed stays
  // quiet. Documented behaviour — if this starts failing, the divisor
  // changed and the docs must change with it.
  assert.equal(scoreCell(14, [1, 10, 1]).tier, null)
})

test('tier boundary sits at z=4', () => {
  // mean 4, floor 2 -> z = (obs-4)/2. obs 11 -> 3.5 watch; obs 13 -> 4.5 act.
  assert.equal(scoreCell(11, [4, 4, 4]).tier, 'watch')
  assert.equal(scoreCell(13, [4, 4, 4]).tier, 'act')
})

test('baseline mean and stddev are what the dashboard will display', () => {
  const r = scoreCell(36, [9, 8, 7])
  assert.ok(close(r.mean, 8), 'mean of [9,8,7] is 8')
  assert.ok(close(r.stddev, 0.816), 'population stddev of [9,8,7] is 0.816')
})
