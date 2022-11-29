import { sign } from 'crypto'
import {
  state,
  inputCompute,
  after,
  before,
  freeze,
  computed,
  cache,
  IHookContext,
  combineLatest,
  CurrentRunnerScope,
  Runner,
  BM,
  compose,
  progress,
  signal,
  action,
  dispose
} from '../src/'
import { loadPlugin } from '../src/plugin'

function injectExternalDescription(f: Function, arr: [any, any]) {
  Object.assign(f, {
    __names__: arr[0],
    __deps__: arr[1]
  })
}

initModelConfig()

export function enterClient() {
  process.env.TARGET = 'client'
  return () => {
    process.env.TARGET = ''
  }
}
export function enterServer() {
  process.env.TARGET = 'server'
  return () => {
    process.env.TARGET = ''
  }
}

export function initContext(arg: {
  name?: IHookContext['name']
  data?: IHookContext['data']
  index: number | undefined
}): IHookContext {
  return {
    initialArgList: [],
    name: arg.name || '',
    data: arg.data || [],
    index: arg.index,
    args: []
  }
}

export function initModelConfig(obj: any = {}) {
  const cacheMap = new Map<CurrentRunnerScope<any> | null, Map<string, any>>()
  const cacheKVMap = new Map<CurrentRunnerScope<any> | null, Map<string, any>>()
  loadPlugin('cookie', {
    async get(scope, key) {
      return cacheMap.get(scope)?.get(key)
    },
    async set(scope, k, v) {
      if (!cacheMap.get(scope)) {
        cacheMap.set(scope, new Map())
      }
      cacheMap.get(scope)?.set(k, v)
    },
    clear() {
      cacheMap.clear()
    }
  })
  loadPlugin('regularKV', {
    async get(scope, key) {
      return cacheKVMap.get(scope)?.get(key)
    },
    async set(scope, k, v) {
      if (!cacheKVMap.get(scope)) {
        cacheKVMap.set(scope, new Map())
      }
      cacheKVMap.get(scope)?.set(k, v)
    },
    clear() {
      cacheKVMap.clear()
    }
  })
}

export function wait(ms: number = 15) {
  return new Promise(r => setTimeout(r, ms))
}
/**
 *
 * some mock drivers
 *
 */
export function blank() {}

export function oneSignal() {
  const s1 = signal(1)
  const s2 = signal(() => {
    return s1() + 1
  })
  const s3 = signal(null)

  const a1 = action((c: number) => {
    s1(v => v + 1)
  })

  return {
    s1,
    s2,
    s3
  }
}

export function returnArg(arg: any) {
  return arg
}
export function oneState(arg: { a: number }) {
  const s1 = state(arg.a)

  return {
    s1
  }
}
export function oneCompute(arg?: { a: number }) {
  const f1 = inputCompute((arg: any) => {})
  return {
    f1
  }
}
export function oneEffect(arg: { a: number; s1Changed: Function }) {
  const stateBM = oneState(arg)

  after(() => {
    arg.s1Changed()
  }, [stateBM.s1])

  return {
    s1: stateBM.s1
  }
}
export function beforeWithFreeze(v: number) {
  const num = state(v)
  num._hook.name = 'beforeWithFreeze.num'

  const markBefore = { value: 0 }

  const addNum = inputCompute(v => {
    // console.log('beforeWithFreeze.addNum')
    num(d => {
      return d + v
    })
  })
  addNum._hook.name = 'beforeWithFreeze.addNum'

  before(() => {
    markBefore.value++
    let cur: any = num()
    if (cur > 0) {
      freeze(addNum)
    }
  }, [addNum])

  return {
    markBefore,
    num,
    addNum
  }
}
export function effectAfter(v: number) {
  const num = state(v)
  num._hook.name = 'effectAfter.num'
  const markBefore = { value: 0 }

  const addNum = inputCompute(v => {
    // console.log('effectAfter.addNum')
    num(d => {
      return d + v
    })
  })
  addNum._hook.name = 'effectAfter.addNum'

  after(() => {
    markBefore.value++
  }, [addNum, num])

  return {
    markBefore,
    num,
    addNum
  }
}

export function plainObjectState(obj1: { [key: string]: any }, num2: number) {
  const s1 = state(obj1)
  const s2 = state(num2)

  return {
    s1,
    s2
  }
}

export function changeStateInputCompute(obj1: { num1: number }, num2: number) {
  const ps = plainObjectState(obj1, num2)

  const { s1, s2 } = ps

  const changeS1 = inputCompute((v: number, v2?: number) => {
    s1((draft: any) => {
      draft.num1 = Math.random()
    })
    s1((draft: any) => {
      draft.num1 = v
    })
    if (v2) {
      s2((d: any) => {
        return d + v2
      })
    }
  })

  return {
    ...ps,
    changeS1
  }
}

export function basicInputCompute() {
  const s1 = state(0)
  const ic1 = inputCompute(() => {
    s1(v => v + 1)
    s1(v => v + 1)
  })

  return {
    s1,
    ic1
  }
}

export function nestedIC() {
  const s1 = state(0)
  const s2 = state(0)
  const ic1 = inputCompute(async () => {
    s1(v => v + 1)
  })
  const ic2 = inputCompute(function* () {
    s2(v => v + 1)

    yield ic1()

    s2(v => v + 1)
  })

  return {
    ic2,
    s1,
    s2
  }
}
Object.assign(nestedIC, {
  __names__: [
    [0, 's1'],
    [1, 's2'],
    [2, 'ic1'],
    [3, 'ic2']
  ]
})

export function changeMultiByInputCompute() {
  const s1 = state({ num: 0 })

  const changeS1 = inputCompute((v: number) => {
    s1(d => {
      d.num = v
    })
    if (s1().num > 5) {
      s1(d => {
        d.num = 10
      })
    } else {
      s1(d => {
        d.num = -10
      })
    }
  })

  return {
    s1,
    changeS1
  }
}

export function changeStateAsyncInputCompute(
  obj1: { num1: number },
  num2: number
) {
  const ps = plainObjectState(obj1, num2)

  const { s1, s2 } = ps

  const changeS1 = inputCompute(async (v: number, v2?: number) => {
    s1((draft: any) => {
      draft.num1 = Math.random()
    })
    await new Promise(resolve => setTimeout(resolve, 100))

    s1((draft: any) => {
      draft.num1 = v
    })
    if (v2) {
      s2((d: any) => {
        return d + v2
      })
    }
  })

  return {
    ...ps,
    changeS1
  }
}
export function changeStateGeneratorInputCompute(
  obj1: { num1: number },
  num2: number
) {
  const ps = plainObjectState(obj1, num2)

  const { s1, s2 } = ps

  const changeS1 = inputCompute(function* (v: number, v2?: number) {
    s1((draft: any) => {
      draft.num1 = Math.random()
    })
    yield new Promise(resolve => setTimeout(resolve, 100))

    s1((draft: any) => {
      draft.num1 = v
    })
    if (v2) {
      s2((d: any) => {
        return d + v2
      })
    }
  })

  return {
    ...ps,
    changeS1
  }
}

export function blankComputed(v: number) {
  const c = computed(() => {
    return v
  })
  return { c }
}
export function onePrimitiveStateComputed(v1: number, v2: number) {
  const s = state(v1)
  const c = computed(() => {
    return s() + v2
  })
  return { s, c }
}
Object.assign(onePrimitiveStateComputed, {
  __deps__: [['h', 1, [0]]]
})

export function asyncComputed(v1: number, v2: number) {
  const s = state(v1)
  const c = computed(async () => {
    return s() + v2
  })
  return { s, c }
}
export function asyncComputed2(v1: number, v2: number) {
  const s = state(v1)
  const c = computed(async () => {
    await new Promise(resolve => setTimeout(resolve, 30))
    return s() + v2
  })
  return { s, c }
}

type AnyYieldType = string | number
export function generatorComputed(v1: number, v2: number) {
  const s = state(v1)
  const c = computed(function* () {
    yield new Promise<AnyYieldType>(resolve => setTimeout(resolve, 1))
    return s() + v2
  })
  return { s, c }
}

export function setterInComputed() {
  const s1 = state(0)
  const c1 = computed(() => {
    if (s1() === 0) {
      s1(v => v + 1)
    }
    return s1()
  })
  return { s1, c1 }
}

export function computedWithArray() {
  const arr = state(new Array(5).fill('_').map((_, i) => ({ num: i })))
  const guard = state(2)
  const arr2 = computed(() => {
    return arr().filter(v => v.num < guard())
  })

  return {
    arr2,
    arr,
    guard
  }
}
export function nestedSimpleComputed() {
  const s1 = state(1)
  const c1 = computed(() => {
    return s1() + 1
  })
  const c2 = computed(() => {
    return c1() + 1
  })

  return {
    s1,
    c1,
    c2
  }
}
Object.assign(nestedSimpleComputed, {
  __names__: [
    [0, 's1'],
    [1, 'c1'],
    [2, 'c2']
  ]
})

export function onlyCache() {
  const c = cache<{ num: number }>('num', {
    from: 'cookie'
  })

  return {
    c
  }
}
export function cacheInIC() {
  const c = cache<{ num: number }>('num', {
    from: 'cookie'
  })

  const changeC1 = inputCompute(async (v: number) => {
    await c(d => {
      return {
        num: v
      }
    })
  })

  return {
    c,
    changeC1
  }
}
export function cacheWithSource(v: { num: number }) {
  const s = state(v)
  const c = cache('num', {
    from: 'cookie',
    source: s
  })

  return {
    s,
    c
  }
}

export function combineTwoState() {
  const s1 = state(0)
  const s2 = state(1)
  const c1 = computed(() => s2() + 1)
  const final = combineLatest([c1, s1])

  return {
    s1,
    s2,
    final
  }
}

export function stateInComputed() {
  const s2 = state(1)
  const c1 = computed(() => s2() + 1)

  return {
    c1,
    s2
  }
}
export function stateInNestedComputed() {
  const s2 = state(1)
  const c1 = computed(() => s2() + 1)
  const c2 = computed(() => c1() + 1)

  return {
    c1,
    c2,
    s2
  }
}
Object.assign(stateInNestedComputed, {
  __names__: [
    [0, 's1'],
    [1, 'c1'],
    [2, 'c2']
  ],
  __deps__: [
    ['h', 1, [0]],
    ['h', 2, [1]]
  ]
})

export function statesWithInputCompute() {
  const s1 = state(0)
  s1._hook.name = 's1'
  const s2 = state(1)
  s2._hook.name = 's2'
  // 2
  const c1 = computed(() => s2() + 1)
  c1._hook.name = 'c1'
  const c2 = computed(() => c1() + 1)
  c2._hook.name = 'c2'
  const c3 = computed(() => s1() + 1)
  c3._hook.name = 'c3'
  // 5
  const ic = inputCompute(() => {
    s1(v => v + 1)
    s2(v => v + 1)
  })

  return {
    c1,
    c2,
    s2,
    s1,
    ic
  }
}
Object.assign(statesWithInputCompute, {
  __deps__: [
    ['h', 2, [1]],
    ['h', 3, [2]],
    ['h', 4, [0]],
    ['h', 5, [], [0, 1]]
  ]
})

export function simpleSS() {
  const s1 = state(0)

  const s2 = computed(() => {
    return s1()
  })

  return { s1, s2 }
}
Object.assign(simpleSS, {
  __deps__: [['h', 1, [0]]],
  __names__: [
    [0, 's1'],
    [1, 's2']
  ],
  __namespace__: 'jest/test'
})

export function composeWithSS() {
  const s1 = state(0)

  const simpleSSResult = compose(simpleSS)

  const s2 = computed(() => {
    return s1()
  })

  return { s1, s2, simpleSSResult }
}
Object.assign(composeWithSS, {
  __namespace__: 'jest/test',
  __deps__: [['h', 1, [0]]],
  __names__: [
    [0, 's1'],
    [1, 's2']
  ]
})

export function composeWithSS2() {
  const s1 = state(0)

  /* insert [state, computed], 2 -> 1 */
  const simpleSSResult = compose(simpleSS)

  const ic = inputCompute(() => {
    s1(v => v + 1)
  })

  /* insert [state, computed] */
  const { s2 } = compose(simpleSS)

  const s33 = computed(() => {
    return s1() + simpleSSResult.s1() + s2()
  })

  return { s1, ic, s33, simpleSSResult }
}
Object.assign(composeWithSS2, {
  __namespace__: 'jest/test',
  __deps__: [
    ['h', 2, [], [0]], // will -> 6
    ['h', 2, [0, ['c', 0, 's1'], ['c', 1, 's2']]] // will -> 6
    // will composed [['h', 1, [0]]] -> [['h', 2, [1]]] ( +1 )
    // will composed [['h', 1, [0]]] -> [['h', 5, [4]]] ( +4 )
  ],
  __names__: [
    [0, 's1'],
    [1, 'ic'],
    [2, 's33']
  ]
})

export function composeDeeplyThan2() {
  const s1 = state(0)

  const composeResult1 = compose(simpleSS)

  /* insert [state, computed], 2 -> 1 */
  const simpleSSResult = compose(composeWithSS2)

  const icComposedState = inputCompute(() => {
    simpleSSResult.s1(v => v + 1)
    s1(v => v + simpleSSResult.s1())
  })

  return {
    composeResult1,
    icComposedState,
    s1
  }
}
Object.assign(composeDeeplyThan2, {
  __namespace__: 'jest/test',
  __deps__: [['h', 1, [['c', 1, 's1']], [0]]],
  __names__: [
    [0, 's1'],
    [1, 'icComposedState']
  ]
})

export function driverWithDispose() {
  const myDisposeFunc = jest.fn(() => {

  })
  dispose(myDisposeFunc)

  return {
    myDisposeFunc
  }
}