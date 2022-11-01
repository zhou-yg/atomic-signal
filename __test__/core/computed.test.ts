import {
  ComputedInitialSymbol,
  getDeps,
  IHookContext,
  Runner,
} from '../../src/'

import * as mockBM from '../mockBM'

describe('computed', () => {
  describe('mount computed', () => {
    it('blank', () => {
      const cv = 1
      const runner = new Runner(mockBM.blankComputed)
      const result = runner.init([cv])
  
      expect(result.c()).toBe(cv)
    })
    it('use primitive state', () => {
      const num1 = 1
      const num2 = 2
      const runner = new Runner(mockBM.onePrimitiveStateComputed)
      const result = runner.init([num1, num2])
  
      expect(result.c()).toBe(num1 + num2)
  
      expect(result.s._hook.watchers.size).toBe(2)
      expect(result.s._hook.watchers.has(runner.scope.watcher)).toBe(true)
      expect(result.s._hook.watchers.has(result.c._hook.watcher)).toBe(true)
    })
    it('use primitive state', async () => {
      const num1 = 1
      const num2 = 2
      const runner = new Runner(mockBM.asyncComputed)
      const result = runner.init([num1, num2])
  
      const c1 = result.c()
      expect(c1).toBe(undefined)
  
      await runner.ready()
  
      expect(result.c()).toBe(num1 + num2)
  
      expect(result.s._hook.watchers.size).toBe(2)
      expect(result.s._hook.watchers.has(runner.scope.watcher)).toBe(true)
      expect(result.s._hook.watchers.has(result.c._hook.watcher)).toBe(true)
    })
    it('use primitive state, change one time', async () => {
      const num1 = 1
      const num2 = 2
      const runner = new Runner(mockBM.onePrimitiveStateComputed)
      const result = runner.init([num1, num2])
  
      expect(result.c()).toBe(num1 + num2)
  
      expect(runner.scope.hooks.length).toBe(2)
      expect((runner.scope.hooks[1])?.watchers.size).toBe(1)
  
      result.s((v: number) => v + 1)
      // await mockBM.wait()
  
      expect(result.c()).toBe(num1 + num2 + 1)
      expect(result.s._hook.watchers.size).toBe(2)
      expect(result.s._hook.watchers.has(runner.scope.watcher)).toBe(true)
      expect(result.s._hook.watchers.has(result.c._hook.watcher)).toBe(true)
    })
    it('use array', async () => {
      const runner = new Runner(mockBM.computedWithArray)
      const result = runner.init()
  
      expect(result.arr()).toEqual([{ num: 0 }, { num: 1 }, { num: 2 }, { num: 3 }, { num: 4 }])
      expect(result.guard()).toBe(2)
      expect(result.arr2()).toEqual([{ num: 0 }, { num: 1 }])
      
      result.guard((d: number) => d + 1)
      // await mockBM.wait()
      
      expect(result.arr()).toEqual([{ num: 0 }, { num: 1 }, { num: 2 }, { num: 3 }, { num: 4 }])
      expect(result.guard()).toBe(3)
      expect(result.arr2()).toEqual([{ num: 0 }, { num: 1 }, { num: 2 }])
    })

    it('nested simple', () => {
      const runner = new Runner(mockBM.nestedSimpleComputed)
      const result = runner.init()

      expect(result.s1()).toBe(1)
      expect(result.c1()).toBe(2)
      expect(result.c2()).toBe(3)
      
      expect(result.c1._hook.watchers.size).toBe(2)

      result.s1(v => v + 1)
      expect(result.s1()).toBe(1 + 1)
      expect(result.c1()).toBe(2 + 1)
      expect(result.c2()).toBe(3 + 1)
    })
    it('bad case: async/await getter',async () => {
      const num1 = 1
      const num2 = 2
      const runner = new Runner(mockBM.asyncComputed2)
      const result = runner.init([num1, num2])
  
      const c1 = result.c()
      expect(c1).toBe(undefined)
  
      await runner.ready()
  
      expect(result.c()).toBe(num1 + num2)
      // after await the state caller is lost Computed context
      expect(result.s._hook.watchers.size).toBe(1)
      expect(result.s._hook.watchers.has(runner.scope.watcher)).toBe(true)
      expect(result.s._hook.watchers.has(result.c._hook.watcher)).toBe(false)
    })
    it('good case: generator getter',async () => {
      const num1 = 1
      const num2 = 2
      const runner = new Runner(mockBM.generatorComputed)
      const result = runner.init([num1, num2])
  
      const c1 = result.c()
      expect(c1).toBe(undefined)
  
      await runner.ready()
  
      expect(result.c()).toBe(num1 + num2)
      expect(result.s._hook.watchers.size).toBe(2)
      expect(result.s._hook.watchers.has(runner.scope.watcher)).toBe(true)
      expect(result.s._hook.watchers.has(result.c._hook.watcher)).toBe(true)
    })
    it('change state inside of computed',async () => {
      const runner = new Runner(mockBM.setterInComputed)
      const { s1, c1 } = runner.init()

      const v1 = s1()
      expect(v1).toBe(0)

      const v2 = c1()
      expect(v2).toBe(1)
      expect(s1()).toBe(1)
    })
  })
  describe('update computed', () => {
    // it ('use primitive state, getter still run again', () => {
    //   const num1 = 1
    //   const num2 = 2
    //   const runner = new Runner(mockBM.onePrimitiveStateComputed)
    //   const cd: IHookContext['data'] = [
    //     ['data', 2],
    //     ['data', 10]  
    //   ]
    //   const context = mockBM.initContext({
    //     data: cd,
    //   })
    //   const result = runner.init([num1, num2], context)
  
    //   // expect(result.c()).toBe(cd[1][1])
    //   expect(result.c()).toBe(cd[0][1] + num2)
  
    //   expect(result.s._hook.watchers.size).toBe(2)
    //   expect(result.s._hook.watchers.has(runner.scope.watcher)).toBe(true)
    //   expect(result.s._hook.watchers.has(result.c._hook.watcher)).toBe(true)
    // })
    it('use primitive state without deps, getter wont re-run', () => {
      const num1 = 1
      const num2 = 2

      const runner = new Runner(mockBM.onePrimitiveStateComputed)

      const cd: IHookContext['data'] = [
        ['data', 2, Date.now()],
        ['data', 10, Date.now()]
      ]
      const context = mockBM.initContext({
        index: undefined,
        data: cd,
      })


      // force delete deps for test
      const deps = getDeps(mockBM.onePrimitiveStateComputed)
      // @ts-ignore
      delete mockBM.onePrimitiveStateComputed.__deps__

      const result = runner.init([num1, num2], context)

      // @ts-ignore
      mockBM.onePrimitiveStateComputed.__deps__ = deps
      
      expect(result.s._hook.watchers.size).toBe(1)
      expect(result.s._hook.watchers.has(runner.scope.watcher)).toBe(true)
      
      expect(result.c()).toBe(cd[1][1])
      expect(result.s._hook.watchers.has(result.c._hook.watcher)).toBe(false)
    })
    it ('use primitive state with depsMap , getter wont run but has dep relation', () => {
      const num1 = 1
      const num2 = 2
      const runner = new Runner(mockBM.onePrimitiveStateComputed)
      const cd: IHookContext['data'] = [
        ['data', 2, Date.now()],
        ['data', 10, Date.now()]  
      ]
      const context = mockBM.initContext({
        index: undefined,
        data: cd,
      })
      const result = runner.init([num1, num2], context)
    
      expect(result.s._hook.watchers.size).toBe(2)
      expect(result.s._hook.watchers.has(runner.scope.watcher)).toBe(true)
      
      expect(result.c()).toBe(cd[1][1])
      expect(result.s._hook.watchers.has(result.c._hook.watcher)).toBe(true)
    })
  })
})
