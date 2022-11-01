import {
  state,
  model,
  inputCompute,
  after,
  before,
  freeze,
  inputComputeInServer,
  computed,
  cache,
  IHookContext,
  combineLatest,
  CurrentRunnerScope,
  Runner,
  BM,
  compose,
  connectModel,
  progress,
  writeModel,
  prisma,
  writePrisma,
  computedInServer,
  createPrisma,
  updatePrisma,
  removePrisma,
  injectWrite,
  injectModel
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
  loadPlugin('Model', {
    async find(e, w) {
      return []
    },
    async update(e, w) {
      return []
    },
    async remove(e, d) {
      return []
    },
    async create(e, d) {
      return {}
    },
    async executeDiff(d) {},
    ...obj
  })
  loadPlugin('Context', {
    async postDiffToServer(d) {},
    async postComputeToServer(c) {
      return []
    },
    async postQueryToServer(c) {
      return []
    },
    ...obj
  })
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

export function useSimpleServerMiddleware(bm: BM) {
  initModelConfig({
    async postComputeToServer(c: IHookContext) {
      process.env.TARGET = 'server'
      const serverRunner = new Runner(bm)
      serverRunner.init(c.initialArgList as [any, any], c)

      if (c.index) {
        await serverRunner.callHook(c.index, c.args)
      }
      const context = serverRunner.scope.createActionContext()

      process.env.TARGET = ''

      return context
    }
  })
}

export function wait(ms: number = 15) {
  return new Promise(r => setTimeout(r, ms))
}

export function blank() {}
export function returnArg(arg: any) {
  return arg
}
export function oneState(arg: { a: number }) {
  const s1 = state(arg.a)

  return {
    s1
  }
}
export function oneModel() {
  const m1 = model('test-model', () => ({}))
  return {
    m1
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

export function changeStateInputComputeServer(
  obj1: { num1: number },
  num2: number
) {
  const ps = plainObjectState(obj1, num2)

  const { s1, s2 } = ps

  const changeS1 = inputComputeInServer((v: number) => {
    s1(draft => {
      draft.num1 = v
    })
  })

  return {
    ...ps,
    changeS1
  }
}
Object.assign(changeStateInputComputeServer, {
  __deps__: [['h', 2, [], [0]]]
})
export function changeOver3ChainDriver() {
  const s1 = state(0)
  const s2 = state(1)
  const s3 = state(2)

  const m1 = prisma('item')
  const m2 = prisma('item')
  const m3 = prisma('item')
  const m4 = prisma('item')
  const m5 = prisma('item')
  const m6 = prisma('item')

  const c1 = computed(() => {})
  const s4 = state(3)

  const ic1 = inputComputeInServer((v: number) => {})

  return {
    ic1
  }
}
Object.assign(changeOver3ChainDriver, {
  __names__: [
    [0, 's1'],
    [1, 's2'],
    [2, 's3'],
    [3, 'm1'],
    [4, 'm2'],
    [5, 'm3'],
    [6, 'm4'],
    [7, 'm5'],
    [8, 'm6'],
    [9, 'c1'],
    [10, 's4'],
    [11, 'ic1']
  ],
  __deps__: [
    ['h', 11, [6, 9], [1, 2]],
    ['h', 9, [3, 4]],
    ['h', 3, [5]],
    ['h', 6, [7, 8]],
    ['h', 8, [7]],
    ['h', 7, [10]]
  ]
})

export function changeStateInputComputeServer2() {
  const s1 = state({ num: 0 })
  const s2 = state(1)

  const c1 = computed(
    jest.fn(() => {
      return s1().num * 2
    })
  )
  const c2 = computed(() => {
    return s2() * 2
  })
  /* 4 */
  const changeS1 = inputComputeInServer((v: number) => {
    s1(draft => {
      draft.num = v
    })
  })

  return {
    s1,
    s2,
    c1,
    c2,
    changeS1
  }
}
Object.assign(changeStateInputComputeServer2, {
  __deps__: [
    ['h', 2, [0], []],
    ['h', 3, [1], []],
    ['h', 4, [], [0]]
  ]
})

export function changeStateInputComputeServer3() {
  const s1 = state(false)
  const s2 = state(0)

  const changeS2 = inputComputeInServer((v: number) => {
    if (s1()) {
      s2(() => v)
    }
  })

  return {
    s1,
    s2,
    changeS2
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
export function multiPatchesInputCompute() {
  const s1 = state(0)
  const item = prisma<{ id?: number; name: string }[]>('item')
  const writeItem = writePrisma(item)

  const ic = inputCompute(function* () {
    yield new Promise<void>(resolve => {
      s1(v => v + 1)
      resolve()
    })

    yield writeItem.create({ id: 3, name: String(s1()) })

    yield writeItem.update(item()[0].id, { name: 'updated' })
  })

  return {
    ic,
    item,
    writeItem,
    s1
  }
}

export function userPessimisticModel() {
  const users = model('item', () => ({}), {
    immediate: true,
    pessimisticUpdate: true
  })

  return {
    users
  }
}
export function userInjectFindModel() {
  const users = model<{ id: number; name: string }[]>('item', () => ({}), {
    immediate: true,
    pessimisticUpdate: true
  })

  injectModel(users, () => {
    return {
      where: {
        name: 'b'
      }
    }
  })

  return {
    users
  }
}

export function writeModelWithSource() {
  const items = model<{ id?: number; name: string }[]>('item', () => ({}))
  const writeItems = writeModel(items, () => ({
    name: name()
  }))
  const name = state('')

  const createItem = inputComputeInServer(async (name: string) => {
    if (name) {
      await writeItems.create({ name })
    } else {
      await writeItems.create()
    }
  })

  return {
    items,
    name,
    createItem
  }
}

export function writeModelByQuickCommand() {
  const items = model<{ id?: number; name: string }[]>('item', () => ({}))
  const name = state('')
  const ci = createPrisma(items, () => ({
    name: name()
  }))

  injectWrite(ci, () => ({
    name: `${name()}${name()}`
  }))

  const ui = updatePrisma(items, () => ({
    name: name()
  }))
  const ri = removePrisma(items)

  const createItem = inputComputeInServer(() => ci())
  const updateItem = inputComputeInServer(id => ui(id))
  const removeItem = inputComputeInServer(id => ri(id))

  return {
    items,
    name,
    createItem,
    updateItem,
    removeItem
  }
}

export function userModelInputeCompute() {
  const items = model<{ id: number; name?: string }[]>('item', () => ({}), {
    immediate: true,
    pessimisticUpdate: true
  })

  const fn = async (id: number, name: string) => {
    const exist = await items.exist({ name })
    if (!exist) {
      await items(arr => {
        if (arr) {
          arr.push({ id, name })
        }
      })
    }
  }
  const createItem = inputCompute(fn)

  return {
    items,
    createItem
  }
}

export function userModelClient() {
  const num = state(1)
  const users = model(
    'item',
    () => ({
      where: {
        id: num()
      }
    }),
    { immediate: true, pessimisticUpdate: true }
  )

  return {
    num,
    users
  }
}
Object.assign(userModelClient, {
  __deps__: [['h', 1, [0]]]
})

export function userModelComputedQuery() {
  const targetName = state('')
  const users = model(
    'item',
    () => ({
      where: {
        name: targetName()
      }
    }),
    { immediate: true, pessimisticUpdate: true }
  )

  return {
    users,
    targetName
  }
}
export function modelInComputed() {
  const targetName = state('')
  const users = prisma<Array<{ id: number; name: string }>>(
    'item',
    () => ({
      where: {
        name: targetName()
      }
    }),
    { immediate: false }
  )
  const userNames = computed(() => {
    return users()?.map(obj => obj.name) || []
  })

  const usersProgress = progress(users)

  return {
    usersProgress,
    users,
    userNames,
    targetName
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

export function hooksInOneLazy() {
  const s1 = state(1)
  const c1 = computed(() => s1())
  const c2 = cache('c2', {
    from: 'cookie'
  })
  const m1 = prisma('item', () => ({}), { immediate: false }) // 3
  const rm1 = writePrisma(m1) // 4
  const ic = inputCompute(function* () {
    yield Promise.resolve()
    const v = s1()
    s1(() => {
      return v + 1
    })
  })

  return {
    s1,
    c1,
    c2,
    m1,
    rm1,
    ic
  }
}
export function hooksInOneModelTrigger() {
  const s1 = state(1)
  const c1 = computed(() => s1())
  const c2 = cache('c2', {
    from: 'cookie'
  })
  const m1 = prisma('item') // 3
  const rm1 = writePrisma(m1) // 4
  const ic = inputCompute(() => {
    s1(() => {
      return 2
    })
  })

  return {
    s1,
    c1,
    c2,
    m1,
    rm1,
    ic
  }
}
Object.assign(hooksInOneModelTrigger, {
  __names__: [
    [2, 'c2'],
    [3, 'm1']
  ]
})

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

export function modelUseCache() {
  const c1 = cache('modelUseCacheCount', { from: 'regularKV' })
  const m1 = prisma(
    'item',
    () => ({
      where: {
        c1: c1()
      }
    }),
    {}
  )

  return { c1, m1 }
}
Object.assign(modelUseCache, {
  __names__: [
    [0, 'c1'],
    [1, 'm1']
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

export function simpleComputedInServer() {
  const s1 = state(0)
  const c = computedInServer(() => {
    return s1()
  })
  return { c }
}
injectExternalDescription(simpleComputedInServer, [
  [0, 's1', 1, 'c'],
  [['h', 1, [0]]]
])

export function subPackageDriver() {
  const m1 = prisma('item')

  return {
    m1
  }
}

Object.assign(subPackageDriver, {
  __names__: [[0, 'm1']],
  __namespace__: 'sub/pacakge'
})

export function composeDriverWithNamespace() {
  const m1 = prisma('item')

  const composeResult = compose(subPackageDriver)

  return {
    m1,
    cm1: composeResult.m1
  }
}

export function writeWritePrisma() {
  const id = state(10)
  const name = state('aa')
  const p1 = prisma('item', () => ({}))

  const wp1 = writePrisma(p1, () => ({
    id: id()
  }))
  injectWrite(wp1, 'create', () => ({
    name: name()
  }))

  const ic = inputCompute(function* () {
    yield wp1.create()
  })

  const itemsLength = computed(() => {
    return p1().length
  })

  return {
    itemsLength,
    p1,
    ic
  }
}
