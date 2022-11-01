import { Runner, cloneDeep, IHookContext } from '../../src/index'

import * as mockBM from '../mockBM'

describe('inputCompute', () => {

  it('post inputCompute to Server', async () => {
    const runner = new Runner(mockBM.changeStateInputComputeServer)

    const onRunnerUpdate = jest.fn(() => {
    })

    mockBM.useSimpleServerMiddleware(mockBM.changeStateInputComputeServer)

    const initArgs: [any, number] = [
      { num1: 0 },
      10
    ]
    const initResult = runner.init(initArgs)
    runner.scope.onUpdate(onRunnerUpdate)

    let newVal1 = 2

    await initResult.changeS1(newVal1)
    
    expect(initResult.s1()).toEqual({ num1: newVal1 })
    expect(onRunnerUpdate).toHaveBeenCalledTimes(0)

    await mockBM.wait()

    expect(onRunnerUpdate).toHaveBeenCalledTimes(1)  
  })
  it('post with timestamp', async () => {
    mockBM.initModelConfig({
      async postComputeToServer (c: IHookContext) {
        process.env.TARGET = 'server'
        const runner = new Runner(mockBM.changeStateInputComputeServer3)
        runner.init([], c)
        if (c.index) {
          await runner.callHook(c.index, c.args)
        }
        process.env.TARGET = ''
        return runner.scope.createInputComputeContext()
      }  
    })
    
    const runner = new Runner(mockBM.changeStateInputComputeServer3)
    const result = runner.init()
    
    let mt1 = result.s1._hook.modifiedTimstamp
    const mt2 = result.s2._hook.modifiedTimstamp

    await result.changeS2(10)

    expect(mt1).toBe(result.s1._hook.modifiedTimstamp)
    expect(mt2).toBe(result.s2._hook.modifiedTimstamp)

    result.s1(() => true)
    expect(result.s1._hook.modifiedTimstamp).toBeGreaterThan(mt1)

    mt1 = result.s1._hook.modifiedTimstamp

    await result.changeS2(10)
    expect(result.s1._hook.modifiedTimstamp).toBe(mt1)
    expect(result.s2._hook.modifiedTimstamp).toBeGreaterThan(mt2)
  })
})