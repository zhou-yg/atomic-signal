import {
  ComputedInitialSymbol,
  debuggerLog,
  getDeps,
  IHookContext,
  Runner,
} from '../../src/'

import * as mockBM from '../mockBM'

describe('computed', () => {
  beforeAll(() => {
    process.env.target = 'client'
  })
  afterAll(() => {
    process.env.target = ''
  })
  describe('mount computed',  () => {

    it('simple', async () => {
      mockBM.useSimpleServerMiddleware(mockBM.simpleComputedInServer)
  
      const runner = new Runner(mockBM.simpleComputedInServer)
      const result = runner.init()

      // debuggerLog(true)
      
      const v1 = result.c()
  
      expect(v1).toBe(undefined)
  
      await runner.ready()
  
      expect(result.c()).toBe(0)
    })
  })
  describe('update computed', () => {
    it('simple', async () => {
      mockBM.useSimpleServerMiddleware(mockBM.simpleComputedInServer)
  
      const runner = new Runner(mockBM.simpleComputedInServer)

      const initContext = mockBM.initContext({
        index: undefined,
        data: [
          ['data', 0, Date.now()],
          ['data', 0, Date.now()]
        ]
      })

      const result = runner.init([], initContext)
      
      const v1 = result.c()
  
      expect(v1).toBe(0)
      expect(result.c()).toBe(0)
  
      await runner.ready()

      expect(result.c()).toBe(0)
    })
  })
})
