import {
  after,
  Runner,
  startdReactiveChain,
  stopReactiveChain,
} from '../../src/'

import * as mockBM from '../mockBM'

describe('effect', () => {
  it('before inputCompute with freeze', async () => {
    const runner = new Runner(mockBM.beforeWithFreeze)
    const onRunnerUpdate = jest.fn(() => {
    })

    const initNum = 0
    const result = runner.init([initNum])
    runner.scope?.onUpdate(onRunnerUpdate)

    expect(result.num()).toBe(initNum)
    expect(result.markBefore).toEqual({ value: 0 })
    expect(runner.scope.hooks.length).toBe(2)

    const plusValue = 2
    result.addNum(plusValue)

    await mockBM.wait()

    expect(result.num()).toBe(initNum + plusValue)
    expect(result.markBefore).toEqual({ value: 1 })
    expect(onRunnerUpdate).toHaveBeenCalledTimes(1)

    result.addNum(plusValue)

    await mockBM.wait()

    expect(result.num()).toBe(initNum + plusValue)
    expect(result.markBefore).toEqual({ value: 2 })
    expect(onRunnerUpdate).toHaveBeenCalledTimes(1)
  })
  it('after inputCompute', async () => {
    const runner = new Runner(mockBM.effectAfter)
    const onRunnerUpdate = jest.fn(() => {
    })
  
    const initNum = 0
    const result = runner.init([initNum])
    runner.scope.onUpdate(onRunnerUpdate)
  
    expect(result.num()).toBe(initNum)
    expect(result.markBefore).toEqual({ value: 0 })
    expect(runner.scope.hooks.length).toBe(2)

    const chain = startdReactiveChain()

    const plusValue = 2
    result.addNum(plusValue)

    await mockBM.wait()

    chain.stop()

    expect(result.num()).toBe(initNum + plusValue)
    expect(result.markBefore).toEqual({ value: 1 })

    expect(onRunnerUpdate).toHaveBeenCalledTimes(1)  
  })

  it('after state', async () => {
    const runner = new Runner(mockBM.plainObjectState)
    const result = runner.init([
      { num: 0 },
      1
    ])

    const s1ChangedCallback = jest.fn(() => {})

    after(() => {
      s1ChangedCallback()
    }, [result.s1])


    result.s1(d => {
      d.num = 1
    })

    await mockBM.wait()

    expect(s1ChangedCallback).toBeCalledTimes(1)
    expect(result.s1()).toEqual({ num: 1 })
  })
})