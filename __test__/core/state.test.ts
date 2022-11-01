import {
  IHookContext,
  Runner,
} from '../../src/'

import * as mockBM from '../mockBM'

describe('state', () => {
  describe('mount state', () => {
    it('use plain object', () => {
      const runner = new Runner(mockBM.plainObjectState)
      const args: [{num1: number}, number] = [
        { num1: 0 },
        10
      ]
      const result = runner.init(args)
  
      expect(result.s1()).toEqual(args[0])
      expect(result.s2()).toEqual(args[1])
    })
    it('watch state changing', () => {
      const runner = new Runner(mockBM.plainObjectState)
      const args: [{num1: number}, number] = [
        { num1: 0 },
        10
      ]
      const result = runner.init(args)
  
      
  
      expect(result.s1()).toEqual(args[0])
      expect(result.s2()).toEqual(args[1])
    })
  })

  describe('update state', () => {
    it('init with context', () => {
      const runner = new Runner(mockBM.plainObjectState)
      const args: [{num1: number}, number] = [
        { num1: 0 },
        10
      ]
      const cd: IHookContext['data'] = [
        ['data', { num1: 1 }, Date.now()],
        ['data', 12, Date.now()]
      ]
      const context = mockBM.initContext({
        index: undefined,
        data: cd
      })
      const result = runner.init(args, context)
  
      expect(result.s1()).toEqual(cd[0][1])
      expect(result.s2()).toEqual(cd[1][1])
    })
  })
})