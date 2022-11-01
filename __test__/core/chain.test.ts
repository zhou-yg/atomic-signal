import {
  Runner,
  startdReactiveChain,
  stopReactiveChain,
  State,
  Computed,
  InputCompute,
  Model,
  Cache,
  WriteModel,
  CurrentRunnerScope,
  debuggerLog,
  ComputedInitialSymbol,
  getPlugin,
} from '../../src/index'

import * as mockBM from '../mockBM'


describe('chain', () => {

  afterEach(() => {
    stopReactiveChain()
  })
  describe('init', () => {
    it('all lazy hooks', () => {
      const runner = new Runner(mockBM.hooksInOneLazy)

      const chain = startdReactiveChain()
  
      runner.init()
  
      chain.stop()

      expect(runner.state()).toBe('idle')
      expect(chain.children.length).toBe(6)
      expect(chain.children[0].hook).toBeInstanceOf(State)
      expect(chain.children[1].hook).toBeInstanceOf(Computed)
      expect(chain.children[2].hook).toBeInstanceOf(Cache)
      expect(chain.children[3].hook).toBeInstanceOf(Model)
      expect(chain.children[4].hook).toBeInstanceOf(WriteModel)
      expect(chain.children[5].hook).toBeInstanceOf(InputCompute)
    })
    it('all lazy hooks, model trigger', () => {
      const runner = new Runner(mockBM.hooksInOneModelTrigger)

      const chain = startdReactiveChain()
  
      runner.init()
  
      chain.stop()

      expect(runner.state()).toBe('pending')
      expect(chain.children.length).toBe(7)

      expect(chain.children[0].hook).toBeInstanceOf(State)
      expect(chain.children[1].hook).toBeInstanceOf(Computed)
      expect(chain.children[2].hook).toBeInstanceOf(Cache)
      expect(chain.children[3].hook).toBeInstanceOf(Model)
      expect(chain.children[4].hook).toBeInstanceOf(WriteModel)
      expect(chain.children[5].hook).toBeInstanceOf(InputCompute)
      //-- trigger
      const triggerScopeChain = chain.children[6]
      expect(triggerScopeChain.hook).toBeInstanceOf(CurrentRunnerScope)
      expect(triggerScopeChain.children[0].hook).toBeInstanceOf(Model)
      expect(triggerScopeChain.children[0].children[0].hook).toBeInstanceOf(Computed)
    })
    it('all lazy hooks, call hook', async () => {
      const runner = new Runner(mockBM.hooksInOneLazy)

      const chain = startdReactiveChain()
  
      runner.init()
  
      expect(runner.state()).toBe('idle')
      expect(chain.children.length).toBe(6)

      await runner.callHook(5, [])

      expect(runner.state()).toBe('idle')
      expect(chain.children.length).toBe(7)

      chain.stop()
      // chain.print()
      //-- trigger
      const triggerScopeChain = chain.children[6]
      expect(triggerScopeChain.hook).toBeInstanceOf(CurrentRunnerScope)
      expect(triggerScopeChain.children[0].hook).toBeInstanceOf(InputCompute)
      expect(triggerScopeChain.children[0].children[0].hook).toBeInstanceOf(State)
    })
    it('model trigger lazy cache', async () => {
      const runner = new Runner(mockBM.modelUseCache)
      const chain = startdReactiveChain()
  
      const scope = runner.prepareScope()
      getPlugin('regularKV').set(scope, 'modelUseCacheCount', 1)
      runner.executeDriver(scope)

      await mockBM.wait()

      chain.stop()

      expect(chain.children.length).toBe(3)

      const triggerModelChain = chain.children[2].children[0]
      expect(triggerModelChain.hook).toBeInstanceOf(Model)
      expect(triggerModelChain.children[0].hook).toBeInstanceOf(Computed)

      const cacheChain = triggerModelChain.children[0].children[0]
      expect(cacheChain.hook).toBeInstanceOf(Cache)
    })
  })

  describe('callHook', () => {
    it('init state -> 1 computed', () => {
      const runner = new Runner(mockBM.stateInComputed)
    
      const { s2, c1 } = runner.init()      
  
      const chain = startdReactiveChain()
      c1()
      chain.stop()
      // root
      expect(chain.hook).toBe(undefined)
      expect(chain.children.length).toBe(1)
      // computed
      expect(chain.children[0].hook).toBeInstanceOf(Computed)
      // state
      expect(chain.children[0].children.length).toBe(1)
      expect(chain.children[0].children[0].hook).toBeInstanceOf(State)
    })
    it('model, cache', () => {
      /** see in ./model.server.test.ts */
    })
  })
  describe('directly call', () => {

    it('state -> nested computed', () => {
      const runner = new Runner(mockBM.stateInNestedComputed)
      const { s2, c1, c2 } = runner.init()
  
      const chain = startdReactiveChain()
  
      s2(v => v + 1)
  
      chain.stop()
  
      expect(s2()).toBe(2)
      expect(c1()).toBe(3)
      expect(c2()).toBe(4) 
     
      // root
      expect(chain.hook).toBe(undefined)
      expect(chain.children.length).toBe(1)
      // state
      expect(chain.children[0].hook).toBeInstanceOf(State)
      expect(chain.children[0].oldValue).toBe(1)
      expect(chain.children[0].newValue).toBe(2)
      // computed c1
      expect(chain.children[0].children.length).toBe(1)
      expect(chain.children[0].children[0].hook).toBeInstanceOf(Computed)
      expect(chain.children[0].children[0].oldValue).toBe(ComputedInitialSymbol)
      expect(chain.children[0].children[0].newValue).toBe(3)
      // call state
      expect(chain.children[0].children[0].children.length).toBe(2)
      expect(chain.children[0].children[0].children[0].hook).toBeInstanceOf(State)
      expect(chain.children[0].children[0].children[0].oldValue).toBe(2)
      // computed c2
      expect(chain.children[0].children[0].children[1].hook).toBeInstanceOf(Computed)
      expect(chain.children[0].children[0].children[1].oldValue).toBe(ComputedInitialSymbol)
      expect(chain.children[0].children[0].children[1].newValue).toBe(4)
    })
  
    it('inputCompute -> state', () => {
      const runner = new Runner(mockBM.statesWithInputCompute)
      const { s1, s2, c1, c2, ic } = runner.init()
  
      const chain = startdReactiveChain()
      ic()
      chain.stop()
      // root
      expect(chain.hook).toBe(undefined)
      expect(chain.children.length).toBe(1)
      // ic
      expect(chain.children[0].hook).toBeInstanceOf(InputCompute)
      expect(chain.children[0].children.length).toBe(2)
  
      const updateReactiveChain = chain.children[0]
      // s1 & s2
      expect(updateReactiveChain.children[0].hook).toBeInstanceOf(State)
      expect(updateReactiveChain.children[0].type).toBe('update')
      expect(updateReactiveChain.children[0].children.length).toEqual(1)
  
      expect(updateReactiveChain.children[1].hook).toBeInstanceOf(State)
      expect(updateReactiveChain.children[1].type).toBe('update')
      expect(updateReactiveChain.children[1].children.length).toBe(1)
  
      // s2 -> c1
      expect(updateReactiveChain.children[1].children[0].hook).toBeInstanceOf(Computed)
      expect(updateReactiveChain.children[1].children[0].children.length).toBe(2)
  
      expect(updateReactiveChain.children[1].children[0].children[0].hook).toBeInstanceOf(State)
      expect(updateReactiveChain.children[1].children[0].children[0].children).toEqual([])
      expect(updateReactiveChain.children[1].children[0].children[0].type).toEqual('call')
  
      expect(updateReactiveChain.children[1].children[0].children[1].hook).toBeInstanceOf(Computed)
      expect(updateReactiveChain.children[1].children[0].children[1].children.length).toEqual(1)
      expect(updateReactiveChain.children[1].children[0].children[1].children[0].hook).toBeInstanceOf(Computed)
    })
  })
})
