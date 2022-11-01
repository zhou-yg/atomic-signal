import {
  Runner,
} from '../../src/'

import * as mockBM from '../mockBM'

describe('runner basic', () => {

  it('run blank', () => {
    const runner = new Runner(mockBM.blank)
    const initResult = runner.init()

    expect(initResult).toEqual(undefined)
    expect(runner.scope.hooks).toStrictEqual([])
  })
  it('run returnArg', () => {
    const runner = new Runner(mockBM.returnArg)

    const arg = { a: 1 }

    const initResult = runner.init([arg])

    expect(initResult).toEqual(arg)
    expect(runner.scope.hooks).toStrictEqual([])
  })
  it('run oneState', () => {
    const runner = new Runner(mockBM.oneState)

    const arg = { a: 1 }

    const scope = runner.prepareScope([arg])
    const initResult = runner.executeDriver(scope)

    expect(initResult.s1()).toEqual(arg.a)
    expect(scope.hooks.length).toStrictEqual(1)
    expect((scope.hooks[0] as any).value).toBe(arg.a)
  })
  it('run onUpdate', async () => {
    const runner = new Runner(mockBM.oneState)
    const onUpdate = jest.fn(() => {
    })

    const arg = { a: 1 }

    const initResult = runner.init([arg])
    runner.scope.onUpdate(onUpdate)

    expect(initResult.s1()).toEqual(arg.a)
    expect(runner.scope.hooks.length).toStrictEqual(1)
    expect((runner.scope.hooks[0] as any).value).toBe(arg.a)

    initResult.s1((d: any) => {
      return d +  1
    })
    await mockBM.wait()

    expect(initResult.s1()).toEqual(arg.a + 1)
    expect(onUpdate).toHaveBeenCalledTimes(1)
  })
  it('run oneState without Runner', () => {
    const arg = { a: 1 }

    try {
      const runner = mockBM.oneState(arg)
    } catch (e: any) {
      expect(e.message).toBe('[state] must under a tarat runner')
    }
  })
  it('run server oneModel', async () => {
    process.env.TARGET = 'server'
    const runner = new Runner(mockBM.oneModel)
    const initResult = runner.init()
    process.env.TARGET = ''

    expect(initResult.m1()).not.toBeInstanceOf(Promise)
    expect(initResult.m1()).toEqual([])

    expect(runner.scope.hooks.length).toBe(1)
    expect((runner.scope.hooks[0] as any).value).toEqual([])
  })
  it('run oneModel without Runner', () => {
    try {
      const runner = mockBM.oneModel()
    } catch (e: any) {
      expect(e.message).toBe('[model] must under a tarat runner')
    }
  })
  it('run oneCompute', () => {
    const runner = new Runner(mockBM.oneCompute)

    const initResult = runner.init()

    expect(typeof initResult.f1).toBe('function')
    expect(runner.scope.hooks.length).toBe(1)
  })
  it('run oneCompute', () => {
    try {
      const runner = mockBM.oneCompute()
    } catch (e: any) {
      expect(e.message).toBe('[inputCompute] must under a tarat runner')
    }
  })
  it('run oneEffect with nested BM', async () => {
    const runner = new Runner(mockBM.oneEffect)

    const onRunnerUpdate = jest.fn(() => {
    })

    const arg = {
      a: 1,
      s1Changed: jest.fn(() => {
      })
    }

    const initResult = runner.init([arg])
    runner.scope.onUpdate(onRunnerUpdate)

    expect(initResult.s1()).toBe(arg.a)
    expect(runner.scope.hooks.length).toBe(1)
    
    expect(onRunnerUpdate).toHaveBeenCalledTimes(0)

    initResult.s1((draft: number) => draft + 1)
    
    await mockBM.wait()
  
    expect(initResult.s1()).toBe(2)
    expect(arg.s1Changed).toHaveBeenCalledTimes(1)
    expect(onRunnerUpdate).toHaveBeenCalledTimes(1)
  })
})