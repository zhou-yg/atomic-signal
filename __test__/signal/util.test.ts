import {
  get,
  set,
} from '../../src/index'
import { produceWithPatches, enablePatches } from 'immer'

enablePatches()

describe('util', () => {
  describe('set/get', () => {
    it('set and get', () => {
      const obj = { a: [0, 1] }
      set(obj, ['a', '1'], 33)

      expect(obj.a[1]).toBe(33)

      const v = get(obj, ['a', 1])
      expect(v).toBe(33)
    })
  })
})
