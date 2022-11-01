import { Runner, IHookContext, State, Computed } from '../../src/index'
import * as mockBM from '../mockBM'

describe('compose', () => {

  it('compose one', () => {

    const runner = new Runner(mockBM.composeWithSS)
    runner.init()

    const { hooks, composes, intialContextNames } = runner.scope

    expect(hooks.length).toBe(4)
    expect(composes.length).toBe(1)

    expect(hooks[0].name).toBe('s1')
    expect(hooks[1].name).toBe('compose.0.simpleSS.s1')
    expect(hooks[2].name).toBe('compose.0.simpleSS.s2')
    expect(hooks[3].name).toBe('s2')

    expect(hooks[0]?.watchers.has((hooks[3] as Computed<any>).watcher)).toBeTruthy()
    expect(hooks[0]?.watchers.size).toBe(2)
    expect(hooks[1]?.watchers.has((hooks[2] as Computed<any>).watcher)).toBeTruthy()
    expect(hooks[1]?.watchers.size).toBe(2)


    intialContextNames?.forEach(arr => {
      expect(hooks[arr[0]].name).toBe(arr[1])
    })
  })

  it('compose multi same hooks', () => {
    const runner = new Runner(mockBM.composeWithSS2)
    runner.init()

    const { hooks, composes, intialContextNames } = runner.scope

    expect(hooks.length).toBe(7)
    expect(composes.length).toBe(2)
    
    expect(hooks[0]?.watchers.has((hooks[6] as Computed<any>).watcher)).toBeTruthy()
    expect(hooks[1]?.watchers.has((hooks[6] as Computed<any>).watcher)).toBeTruthy()
    expect(hooks[5]?.watchers.has((hooks[6] as Computed<any>).watcher)).toBeTruthy()

    intialContextNames?.forEach(arr => {
      expect(hooks[arr[0]].name).toBe(arr[1])
    })
  })
  it('compose deeply driver greater than 2', () => {
    const runner = new Runner(mockBM.composeDeeplyThan2)
    runner.init()

    expect(runner.scope.composes.length).toBe(4)

    // console.log('runner.scope.intialContextDeps: ', runner.scope.intialContextDeps);

    const rootDeps = runner.scope.intialContextDeps.slice(0, 1)

    expect(rootDeps[0][2][0][0]).toBe('c')
    expect(rootDeps[0][2][0][1]).toBe(3)

    const composeSS2Deps = runner.scope.intialContextDeps.slice(2, 4)

    expect(composeSS2Deps[1][2][1][1]).toBe(1)
    expect(composeSS2Deps[1][2][2][1]).toBe(2)
  })


  describe('update', () => {
    it('with nested compose deps', () => {

      const context = mockBM.initContext({
        index: -1
      })
      const runner = new Runner(mockBM.composeWithSS2)
      runner.init([], context)

      const { hooks, composes, intialContextNames } = runner.scope

      expect(hooks.length).toBe(7)
      expect(composes.length).toBe(2)
      
      expect(hooks[0]?.watchers.has((hooks[6] as Computed<any>).watcher)).toBeTruthy()
      expect(hooks[1]?.watchers.has((hooks[6] as Computed<any>).watcher)).toBeTruthy()
      expect(hooks[5]?.watchers.has((hooks[6] as Computed<any>).watcher)).toBeTruthy()

      intialContextNames?.forEach(arr => {
        expect(hooks[arr[0]].name).toBe(arr[1])
      })    
    })
  })
})