import { Runner, IHookContext, before } from '../../src/index'

import * as mockBM from '../mockBM'

describe('initContext', () => {
  it('init context to state', () => {
    const args: [ {num1: number}, number ] = [
      { num1: 0 },
      10
    ]
    const context: IHookContext = {
      name: mockBM.plainObjectState.name,
      initialArgList: [],
      args: [],
      data: [
        ['state', { numStr: 'from context' }, Date.now()],
        ['state', null]
      ]
    }
    const runner = new Runner(mockBM.plainObjectState)
    const result = runner.init(args, context)

    expect(result.s1()).toEqual(context.data[0][1])
    expect(result.s2()).toEqual(context.data[1][1])
  })
  it('access state getter without context', () => {
    const args: [ {num1: number}, number ] = [
      { num1: 0 },
      10
    ]
    const context: IHookContext = {
      name: mockBM.plainObjectState.name,
      initialArgList: [],
      args: [],
      data: [
        ['state', { numStr: 'from context' }, Date.now()],
        ['state']
      ]
    }
    const runner = new Runner(mockBM.plainObjectState)
    const result = runner.init(args, context)

    expect(result.s1()).toEqual(context.data[0][1])
    try {
      result.s2()
    } catch (e: any) {
      expect(e.message).toBe('[update getter] cant access un initialized hook(1)')
    }
  })
  it('access model getter without context', () => {
    const context: IHookContext = {
      name: mockBM.plainObjectState.name,
      initialArgList: [],
      args: [],
      data: [
        ['model']
      ]
    }
    const runner = new Runner(mockBM.oneModel)
    const result = runner.init([], context)

    try {
      result.m1()
    } catch (e: any) {
      expect(e.message).toBe('[update getter] cant access un initialized hook(0)')
    }
  })
  it('callHook remote', async () => {
    mockBM.useSimpleServerMiddleware(mockBM.changeStateInputComputeServer)

    const args: [ {num1: number}, number ] = [
      { num1: 0 },
      1
    ]
    const clientRunner = new Runner(mockBM.changeStateInputComputeServer)
    const r = clientRunner.init(args)

    expect(r.s1()).toEqual(args[0])
    expect(r.s2()).toEqual(args[1])

    const newVal = 10
    await r.changeS1(newVal)

    expect(r.s1()).toEqual({ num1: newVal })
    expect(r.s2()).toEqual(args[1])
  })

  describe('with depsMap', () => {
    it('call remote compute with deps', async () => {
      mockBM.initModelConfig({
        async postComputeToServer (c: IHookContext) {
          process.env.TARGET = 'server'
          const serverRunner = new Runner(mockBM.changeStateInputComputeServer2)

          expect(c.data[1]).toEqual(['unserialized'])
          expect(c.data[3]).toEqual(['unserialized'])

          const serverR = serverRunner.init([], c)
    
          if (c.index) {
            await serverRunner.callHook(c.index, c.args)
          }
          const context = serverRunner.scope.createInputComputeContext()
    
          process.env.TARGET = ''

          expect(serverR.c1._hook.getter).toBeCalledTimes(1)
          
          return context
        }
      })
      const clientRunner = new Runner(mockBM.changeStateInputComputeServer2)
  
      /**
       * call ic which hook index equal 4
       * so that the runner only implement the deps who is refered by index 4
       */
      const context = mockBM.initContext({
        index: 4,
        data: [
          ['state', { num: 1 }, Date.now()],
          ['unserialized'],
          ['computed', 3, Date.now()],
          ['computed', 4, Date.now()],
        ]
      })
      const r = clientRunner.init([], context)

      expect(r.s1()).toEqual({ num: 1 })
      expect(r.s2._hook === null).toBeTruthy()
      expect(r.s1._hook.watchers.size).toBe(2)

      const newVal = 10
      await r.changeS1(newVal)

      expect(r.s1()).toEqual({ num: newVal })
      expect(r.c1()).toEqual(newVal * 2)
    })
  })

  describe('context serialization to server', () => {
    beforeAll(() => {
      process.env.TARGET = 'client'
    })
    afterAll(() => {
      process.env.TARGET = ''
    })
    it('simple', () => {
      const clientRunner = new Runner(mockBM.changeOver3ChainDriver)
      const scope = clientRunner.prepareScope()
      const result = clientRunner.executeDriver(scope)
      
      const context = scope.createShallowActionContext(scope.hooks[11]);

      [11, 1, 2,
        9,
        6, 7, 8, 10].forEach(i => {
          expect(`[${i}] ${context.data[i][0]}`).not.toEqual(`[${i}] unserialized`)
        })
    })
    // it.only('simple', () => {
    //   const clientRunner = new Runner(mockBM.changeOver3ChainDriver)
    //   const scope = clientRunner.prepareScope()
    //   const result = clientRunner.executeDriver(scope)
      
    //   const context = scope.createShallowActionContext(scope.hooks[11]);
    //   [11, 1, 2,
    //     9, 3, 4, 5,
    //     6, 7, 8, 10].forEach(i => {
    //       expect(context.data[i]).not.toEqual('unserialized')
    //     })
    // })
  })
})