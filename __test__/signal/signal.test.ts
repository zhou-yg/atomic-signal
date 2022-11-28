import {
  Computed,
  isSignal,
  Runner, State,
} from '../../src'

import * as mockBM from '../mockBM'

describe('signal', () => {

  it('one signal', () => {
    const runner = new Runner(mockBM.oneSignal)
    const initResult = runner.init()

    expect(initResult.s1._hook).toBeInstanceOf(State)
    expect(initResult.s2._hook).toBeInstanceOf(Computed)
    expect(initResult.s3._hook).toBeInstanceOf(State)
    expect(initResult.s3._hook).not.toBeInstanceOf(Computed)

    const r1 = isSignal(initResult.s1)
    const r2 = isSignal(initResult.s2)

    expect(r1).toBeTruthy()
    expect(r2).toBeTruthy()
  })
})