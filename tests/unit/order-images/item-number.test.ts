import { describe, expect, it } from 'vitest'

import {
  isVarietyNumber,
  isValidItemNumber,
  nextSingleNumber,
  nextVarietyNumber,
  parentItemNumber,
} from '@/lib/order-images/item-number'

// The numbering rules are inherited from eu-shipment and both the form
// (preview labels, disabled buttons) and the server (what actually gets
// created) run this one module, so these cases are the contract for both.
describe('item numbering', () => {
  describe('isVarietyNumber / parentItemNumber', () => {
    it('treats multiples of 100 as singles and everything else as a variety', () => {
      expect(isVarietyNumber(100)).toBe(false)
      expect(isVarietyNumber(200)).toBe(false)
      expect(isVarietyNumber(110)).toBe(true)
      expect(isVarietyNumber(190)).toBe(true)
    })

    it('maps a variety to the pack directly below it', () => {
      expect(parentItemNumber(110)).toBe(100)
      expect(parentItemNumber(190)).toBe(100)
      expect(parentItemNumber(210)).toBe(200)
    })

    it('maps a single to itself', () => {
      expect(parentItemNumber(100)).toBe(100)
      expect(parentItemNumber(300)).toBe(300)
    })
  })

  describe('isValidItemNumber', () => {
    it('accepts singles and varieties within one pack span', () => {
      expect(isValidItemNumber(100)).toBe(true)
      expect(isValidItemNumber(200)).toBe(true)
      expect(isValidItemNumber(110)).toBe(true)
      expect(isValidItemNumber(190)).toBe(true)
      expect(isValidItemNumber(290)).toBe(true)
    })

    it('rejects numbers below the first single or off the step', () => {
      expect(isValidItemNumber(90)).toBe(false)
      expect(isValidItemNumber(95)).toBe(false)
      expect(isValidItemNumber(99)).toBe(false)
      expect(isValidItemNumber(105)).toBe(false)
      expect(isValidItemNumber(199)).toBe(false)
    })
  })

  describe('nextSingleNumber', () => {
    it('starts at 100 on an empty order', () => {
      expect(nextSingleNumber([])).toBe(100)
    })

    it('steps by 100 from the highest existing single', () => {
      expect(nextSingleNumber([100])).toBe(200)
      expect(nextSingleNumber([100, 200, 300])).toBe(400)
    })

    it('does not depend on the order of the rows', () => {
      expect(nextSingleNumber([200, 100])).toBe(300)
    })
  })

  describe('nextVarietyNumber', () => {
    it('starts at +10 under the pack', () => {
      expect(nextVarietyNumber(100, [])).toBe(110)
      expect(nextVarietyNumber(100, [110])).toBe(120)
      expect(nextVarietyNumber(200, [])).toBe(210)
    })

    it('allows the ninth variety', () => {
      expect(nextVarietyNumber(100, [110, 120, 130, 140, 150, 160, 170, 180])).toBe(190)
    })

    it('reports a full pack once nine children exist', () => {
      expect(nextVarietyNumber(100, [110, 120, 130, 140, 150, 160, 170, 180, 190])).toBeNull()
    })

    it('reports a full pack when the only child is already the last one', () => {
      // The +90 span rule fires before the count rule here: 190 has no room
      // left under 100 even though the pack holds a single child.
      expect(nextVarietyNumber(100, [190])).toBeNull()
    })
  })
})
