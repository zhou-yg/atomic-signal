import { applyPatches } from 'immer'
import type {
  IModelCreateData,
  IModelData,
  IModelQuery,
  IQueryWhere
} from './plugin'
import co from './lib/co'
export const isArray = Array.isArray
/* copy from immer's common.ts  */
export type AnyObject = { [key: string]: any }
export const ownKeys: (target: AnyObject) => PropertyKey[] = Reflect.ownKeys
export const getOwnPropertyDescriptors = Object.getOwnPropertyDescriptors

export function shallowCopy(base: any): any {
  if (isArray(base)) return Array.prototype.slice.call(base)
  const descriptors = getOwnPropertyDescriptors(base)
  let keys = ownKeys(descriptors)
  for (let i = 0; i < keys.length; i++) {
    const key: any = keys[i]
    const desc = descriptors[key]
    if (desc.writable === false) {
      desc.writable = true
      desc.configurable = true
    }
    // like object.assign, we will read any _own_, get/set accessors. This helps in dealing
    // with libraries that trap values, like mobx or vue
    // unlike object.assign, non-enumerables will be copied as well
    if (desc.get || desc.set)
      descriptors[key] = {
        configurable: true,
        writable: true, // could live with !!desc.set as well here...
        enumerable: desc.enumerable,
        value: base[key]
      }
  }
  return Object.create(Object.getPrototypeOf(base), descriptors)
}
/* HELPERS */
const getKeys = Object.keys

export const isEqual = (x: any, y: any): boolean => {
  if (x === y) return true

  if (
    typeof x === 'object' &&
    typeof y === 'object' &&
    x !== null &&
    y !== null
  ) {
    if (isArray(x)) {
      if (isArray(y)) {
        let xLength = x.length
        let yLength = y.length

        if (xLength !== yLength) return false

        while (xLength--) {
          if (!isEqual(x[xLength], y[xLength])) return false
        }

        return true
      }

      return false
    } else if (isArray(y)) {
      return false
    } else {
      let xKeys = getKeys(x)
      let xLength = xKeys.length
      let yKeys = getKeys(y)
      let yLength = yKeys.length

      if (xLength !== yLength) return false

      while (xLength--) {
        const key = xKeys[xLength]
        const xValue = x[key]
        const yValue = y[key]

        if (!isEqual(xValue, yValue)) return false

        if (yValue === undefined && !Reflect.has(y, key)) return false
      }
    }

    return true
  }

  return x !== x && y !== y
}

export function last<T>(arr: T[]): T {
  return arr[arr.length - 1]
}
export function cloneDeep(obj?: any) {
  return obj && JSON.parse(JSON.stringify(obj))
}

export function applyPatchesToObject(target: any, patches: IDataPatch[]) {
  patches.forEach((p: IDataPatch) => {
    switch (p.op) {
      case 'add':
        set(target, p.path, p.value)
        break
      case 'remove':
        deleteKey(target, p)
        break
      case 'replace':
        set(target, p.path, p.value)
        break
    }
  })
}

export function isPrimtive(v: any) {
  if (v === null) {
    return true
  }
  const type = typeof v
  return [
    'undefined',
    'number',
    'symbol',
    'string',
    'bigint',
    'boolean'
  ].includes(type)
}

export function deleteKey(obj: any, p: IDataPatch) {
  const { path, value } = p
  let tail = path.length > 0 ? get(obj, path.slice(0, -1)) : obj
  const key = last(path)
  if (tail instanceof Set) {
    tail.delete(value)
  }
  if (tail instanceof Map) {
    tail.delete(key)
  } else {
    delete tail[key]
  }
}

export function set(obj: any, path: string | (number | string)[], value: any) {
  let base = obj
  const currentFieldPath = isArray(path)
    ? path.slice(0)
    : path.split
    ? path.split('.')
    : [path]
  if (currentFieldPath.length > 0) {
    const fieldName = currentFieldPath.pop()
    currentFieldPath.forEach((p, i) => {
      if (base[p] === undefined) base[p] = {}
      base = base[p]
    })
    if (base instanceof Map) {
      base.set(fieldName, value)
    } else if (base instanceof Set) {
      base.add(value)
    } else {
      base[fieldName!] = value
    }
  }
}

export function get(obj: any, path: string | (number | string)[]) {
  let base = obj
  const pathArr = isArray(path)
    ? path.slice(0)
    : path.split
    ? path.split('.')
    : [path]
  if (pathArr.length === 0) {
    return obj
  }
  const currentPathArr = pathArr.slice(0, -1)
  const key = last(pathArr)
  for (const p of currentPathArr) {
    if (base[p] === undefined) return undefined
    base = base[p]
  }
  if (base instanceof Map) {
    return base.get(key)
  }
  return base[key]
}

export function map(
  target: object | any[],
  callback: (v: any, i: number, self: any[]) => any
) {
  if (!target || typeof target !== 'object') {
    throw new Error('can not map')
  }
  if (isArray(target)) {
    return target.map(callback)
  }
  return Object.values(target).map(callback)
}

export function likeObject(target: any): target is Object {
  return target && typeof target === 'object'
}

export function isDef(v?: any): v is any {
  return typeof v !== 'undefined'
}
export function isUndef(v?: any): v is undefined {
  return typeof v === 'undefined'
}

export function isFunc(f?: Function | any): f is Function {
  return typeof f === 'function'
}

export function isAsyncFunc<T>(f?: any): f is () => Promise<T> {
  return f && f[Symbol.toStringTag] === 'AsyncFunction'
}
export function isPromise<T>(p?: any): p is Promise<T> {
  return p && (p instanceof Promise || !!p.then)
}

export function isGenerator(g: any): g is Generator {
  return g && 'function' == typeof g.next && 'function' == typeof g.throw
}

export function nextTick(fn: () => void) {
  // const p = Promise.resolve()
  // let run = true
  // p.then(() => {
  //   if (run) {
  //     fn()
  //   }
  // })
  let st = setTimeout(fn, 0)
  return () => clearTimeout(st)
}

export type TContextData = string

interface IContextHookPatch {
  op: 'replace'
  index: number
  name?: string
  oldValue: any
}

export interface IStatePatchRecord {
  timing: number
  patch: IModelPatch[]
}

export interface IHookContext {
  // snapshot
  initialArgList: any
  data: Array<
    | [TContextData, Promise<any>, number]
    | [TContextData, null]
    | [TContextData]
    | [TContextData, any, number]
  >
  name: string
  // action
  index?: number
  indexName?: string
  args?: any[]
  // patches
  // ...
  patch?: [string, IStatePatchRecord[]][]
}

export type THookDeps = Array<
  [
    'h' | 'ic',
    number,
    (number | ['c', number, string])[], // get
    (number | ['c', number, string])[]? // set
  ]
>

export function findWithDefault<T>(
  arr: T[],
  fn: (a: T) => boolean,
  defaults?: T
): T | void {
  let e = arr.find(fn)
  if (!e && defaults) {
    e = defaults
    arr.push(e)
  }
  return e
}

export type IPatch = IDataPatch | IModelPatch

export const isDataPatch = (p: IPatch) => Reflect.has(p, 'path')
export const isModelPatch = (p: IPatch) => !Reflect.has(p, 'path')

// for data
export interface IDataPatch {
  op: 'replace' | 'add' | 'remove'
  path: (string | number)[]
  value?: any
}
// for model
export type IModelPatchCreate = {
  op: 'create'
  value: IModelCreateData
}
export type IModelPatchUpdate = {
  op: 'update'
  value: IModelData
}
export type IModelPatchRemove = {
  op: 'remove'
  value: Omit<IModelData, 'data'>
}

export type IModelPatch =
  | IModelPatchCreate
  | IModelPatchUpdate
  | IModelPatchRemove

export interface IStackUnit {
  value: {
    [k: string]: any
  }
  source: {
    [k: string]: any
  }
  currentFieldPath: string
}

/**
 * 预处理patch，推导数组通过splice，找到被删除的元素。修正的patches语义已经跟immer冲突了，不能再二次使用
 * arr.splice(0, 1) -> 0 后面的全部前移，最后length = length -1 完成
 * 删除尾部，直接减少length
 * 删除非尾部, 尾部往前占位，再减少length
 *
 * 考虑新增：如果在删除的过程中又有新增，则新增会去占位已经删除的数据位置，如果通过equal来检查，有可能新增的值跟之前是一样的，如何确认这个数据是新增的还是旧的？
 *  站在DB的场景里思考：如果是含有id的一样，那对于DB来说就不是新增
 *    但可能的异常是：在乐观更新的机制下，新增了无id对象，在更新数据库的异步期间，又新增了，但是因为跟之前的本地内存里的，无id对象一样，误判成了是移动，最后导致异步期间的新增都无效了
 *      解决方法：乐观更新的model，在生产patch需要维护一个本地序列来生产
 */

function preparePatches2(data: any | any[], ps: IDataPatch[]) {
  const lengthPatchIndexes: Array<[number, any, (string | number)[]]> = []
  ps.forEach((p, i) => {
    const source = p.path.length === 1 ? data : get(data, p.path.slice(0, -1))
    if (isArray(source) && last(p.path) === 'length') {
      lengthPatchIndexes.push([i, source, p.path.slice(0, -1)])
    }
  })
  if (lengthPatchIndexes.length > 0) {
    const allInsertPatches: Array<[number, number, IDataPatch[]]> = []

    lengthPatchIndexes.forEach(([index, source, currentPath]) => {
      const newArrLength = ps[index].value
      const sourcePatches: IDataPatch[] = []

      let startMovingIndex = index - 1
      for (index - 1; startMovingIndex >= 0; startMovingIndex--) {
        const p = ps[startMovingIndex]
        const currentSource =
          p.path.length === 1 ? data : get(data, p.path.slice(0, -1))
        if (currentSource === source) {
          sourcePatches.unshift({
            ...p,
            path: p.path.slice(-1)
          })
        } else {
          break
        }
      }
      const newSource = applyPatches(source, sourcePatches)

      const reservedPatches: IDataPatch[] = []
      const newInsertPatches: IDataPatch[] = []

      sourcePatches.forEach(p => {
        // value: maybe add, reserve
        // path: maybe remove, reserve (including length)
        const { path, value } = p
        const existInOldIndex = source.findIndex((v: any) => isEqual(v, value))
        const existInNewIndex = newSource.findIndex((v: any) =>
          isEqual(v, value)
        )
        const alreadyReversed1 = reservedPatches.find(p =>
          isEqual(p.value, value)
        )
        // add
        if (existInOldIndex === -1 && existInNewIndex > -1) {
          newInsertPatches.push({
            op: 'add',
            value,
            path: currentPath.concat(path)
          })
        } else if (existInOldIndex > -1 && existInNewIndex > -1) {
          if (!alreadyReversed1) {
            reservedPatches.push({
              op: 'replace',
              value,
              path: currentPath.concat(path)
            })
          }
        }
        const oldPathValue = get(source, path)
        const oldExistInNewIndex = newSource.findIndex((v: any) =>
          isEqual(v, oldPathValue)
        )
        const alreadyReversed2 = reservedPatches.find(p =>
          isEqual(p.value, oldPathValue)
        )
        if (oldExistInNewIndex > -1) {
          if (!alreadyReversed2) {
            reservedPatches.push({
              op: 'replace',
              value: oldPathValue,
              path: currentPath.concat(path)
            })
          }
        } else {
          newInsertPatches.push({
            op: 'remove',
            value: oldPathValue,
            path: currentPath.concat(path)
          })
        }
      })
      // directly remove tail
      if (newArrLength < source.length) {
        let si = newArrLength

        let reservedDataValuesMarks = reservedPatches.map(({ value }) => value)
        while (si < source.length) {
          const oldReservedLength = reservedDataValuesMarks.length
          // @TODO: immer的object是重新生成的，在引用上并不相等，所以需要isEqual
          // 防止值被重复消费，因为数组的值有可能是重复的
          reservedDataValuesMarks = reservedDataValuesMarks.filter(
            v => !isEqual(source[si], v)
          )
          if (reservedDataValuesMarks.length === oldReservedLength) {
            // 当前值不是要保留的值，标记“删除”
            newInsertPatches.push({
              op: 'remove',
              value: source[si],
              path: currentPath.concat(si)
            })
          }
          si++
        }
      }
      // newInsertPatches.length must gt 1
      allInsertPatches.push([
        startMovingIndex + 1,
        index - startMovingIndex,
        newInsertPatches
      ])
    })
    let offset = 0
    allInsertPatches.forEach(([st, length, arr]) => {
      ps.splice(st - offset, length, ...arr)
      offset = offset + length - arr.length
    })
  }

  return ps
}

export type IDiff = ReturnType<typeof calculateDiff>
/**
 * 根据patch计算diff，决定要进行的数据库操作
 */
export function calculateDiff(data: any | any[], ps: IDataPatch[]) {
  data = cloneDeep(data)

  ps = preparePatches2(data, ps)

  let create: IStackUnit[] = []
  let update: IStackUnit[] = []
  const remove: IStackUnit[] = []

  ps.filter(p => p.path.length > 0).forEach(p => {
    if (p.path && p.path.length > 0) {
      const source = p.path.length === 1 ? data : get(data, p.path.slice(0, -1))
      // CAUTION: 是不是太暴力
      const pathSkipArr = p.path.filter((k, i) => {
        return !isArray(get(data, p.path.slice(0, i)))
      })

      const patchValue = Reflect.has(p, 'value') ? p.value : get(data, p.path)

      /** 4种情况（针对model，没有数组 -> 数组的情况）
       *
       * 重点是区分: a.0.b  a.b  a.b.0   0.a.b ， 因为前面数组被过滤了，所以最终都是 a.b
       *
       * 取到的是current对象, root = { a:{ b:[x]} } -> root.a.b.0，对象->数组, source=array
       *   x=object --> a.b
       *   x=primitiv --> invalid
       * root={a:{ b:x }} -> root.a.b 对象->对象, source=object
       *   x=object --> a.b
       *   x=primitive --> a
       * root=[{ a: { b: x } }] -> root.0.a.b， 数组->对象->对象, source=object
       *   x=object --> a.b
       *   x=primitive --> a
       * root=[{ a: [{ b: x }] }] -> root.a.0.b， 数组->对象, source=array
       *   x=object -> a.b
       *   x=primtive --> a
       */
      const currentFieldPath = pathSkipArr
        .slice(0, likeObject(patchValue) ? Infinity : -1)
        .join('.')

      const lastPathKey = p.path[p.path.length - 1]

      switch (p.op) {
        case 'replace':
          {
            // cant handle the primitive patch in array
            if (isArray(source) && !likeObject(patchValue)) {
              return
            }
            const exist = findWithDefault(
              update,
              u => u.currentFieldPath === currentFieldPath,
              {
                source,
                value: {},
                currentFieldPath
              }
            )
            if (exist) {
              if (isArray(source)) {
                exist.value = patchValue // should bring "id"
              } else {
                Object.assign(exist.value, {
                  [lastPathKey]: patchValue
                })
              }
            }
          }
          break
        case 'add':
          {
            if (isArray(source)) {
              if (likeObject(patchValue)) {
                create.push({
                  source,
                  value: patchValue,
                  currentFieldPath
                })
              }
            } else {
              if (likeObject(patchValue)) {
                create.push({
                  source,
                  value: patchValue,
                  currentFieldPath
                })
              } else {
                const exist = findWithDefault(
                  update,
                  u => u.currentFieldPath === currentFieldPath,
                  {
                    source,
                    value: {},
                    currentFieldPath
                  }
                )
                if (exist) {
                  Object.assign(exist.value, {
                    [lastPathKey]: patchValue
                  })
                }
              }
            }
          }
          break
        case 'remove':
          {
            if (likeObject(patchValue)) {
              if (isArray(source)) {
                remove.push({
                  source,
                  value: patchValue,
                  currentFieldPath
                })
              } else {
                remove.push({
                  source,
                  value: patchValue,
                  currentFieldPath
                })
              }
            } else {
              const exist = findWithDefault(
                update,
                u => u.currentFieldPath === currentFieldPath,
                {
                  source,
                  value: {},
                  currentFieldPath
                }
              )
              if (exist) {
                Object.assign(exist.value, {
                  [lastPathKey]: null
                })
              }
            }
          }
          break
      }
    }
  })

  //combines
  remove.forEach(u => {
    create = create.filter(c => c.currentFieldPath === u.currentFieldPath)
    update = update.filter(c => c.currentFieldPath === u.currentFieldPath)
  })

  return {
    create,
    update,
    remove
  }
}
export type TPath = (string | number)[]
/**
 * 修改了对象或数组的patch，计算
 * 如果修改了数组的子元素，就上升到整个数组，因为数组的变化通过patch来反推太不准确了
 * patch本身已经是按计算并合并过的，这里不需要考虑合并问题
 * a.0.b.0.c --> a 变化
 * a.b.c --> a.b.c 变化，需要通知到a.b吗？因为如果不是进一步的依赖，那说明b就是primitive的
 */
export function calculateChangedPath(source: any, ps: IDataPatch[]): TPath[] {
  if (isArray(source)) {
    return [['']] // root
  }
  const result: TPath[] = []
  ps.forEach(p => {
    const i = p.path.findIndex((v, i) => {
      return (
        typeof v === 'number' && isArray(get(source, p.path.slice(0, i + 1)))
      )
    })
    if (i > -1) {
      result.push(p.path.slice(0, i))
    } else {
      result.push(p.path.slice())
    }
  })
  return result
}

// execute in server side
// export function getDiffExecution() {
//   return getModelConfig().executeDiff
// }
// // execute in client side
// export function getPostDiffToServer() {
//   return getModelConfig().postDiffToServer
// }

let currentEnv: null | string = null
export function setEnv(env: 'server' | 'client') {
  currentEnv = env
}

export function getEnv() {
  return {
    client: currentEnv === 'client',
    server: currentEnv === 'server'
  }
}

export let enableLog: boolean = false
export function log(pre: string, ...rest: any[]) {
  if (enableLog) {
    console.log(`[${process.env.TARGET || ''}] [${pre}]`, ...rest)
  }
}
export function debuggerLog(open: boolean) {
  enableLog = open
}

export function checkQueryWhere(where: IQueryWhere['where']): boolean {
  return where
    ? !Object.values(where).some(v => {
        if (typeof v === 'object') {
          return !checkQueryWhere(v as any)
        }
        return v === undefined
      })
    : true
}

export function getDeps(f: Driver) {
  return f.__deps__
}
export function getName(f: Driver) {
  return f.__name__ || f.name
}
export function getNamespace(f: Driver) {
  return f.__namespace__
}
export function getNames(f: Driver) {
  return f.__names__
}

export type THookNames = [number, string][]

export interface Driver extends Function {
  (...prop: any): any
  __deps__?: THookDeps
  __names__?: THookNames // hook name by index
  __name__?: string
  __namespace__?: string
}
export type BM = Driver

export function runGenerator(
  gen: Generator,
  onResume: () => void,
  onSuspend: () => void
) {
  return co(gen, {
    onResume: onResume,
    onSuspend: onSuspend
  })
}

export function makeBatchCallback<T extends (...prop: any[]) => any>(fn: T) {
  let cancelNotify = () => {}
  return (...args: Parameters<T>) => {
    cancelNotify()
    cancelNotify = nextTick(() => {
      fn(...args)
    })
  }
}
export function shortValue(v: undefined | Symbol | any) {
  if (v === undefined) {
    return '@undef'
  }
  if (typeof v === 'symbol') {
    return '@init'
  }
}

export class DataGraphNode {
  // relation types
  toGet = new Set<DataGraphNode>()
  toSet = new Set<DataGraphNode>()
  toCall = new Set<DataGraphNode>()

  constructor(public id: number, public type: THookDeps[0][0]) {}
  addToGet(n: DataGraphNode) {
    this.toGet.add(n)
  }
  addToSet(n: DataGraphNode) {
    this.toSet.add(n)
  }
  addToCall(n: DataGraphNode) {
    this.toCall.add(n)
  }
  get children() {
    return new Set<DataGraphNode>([
      ...this.toGet,
      ...this.toSet,
      ...this.toCall
    ])
  }
  getAllChildren(all: Set<DataGraphNode> = new Set()): Set<DataGraphNode> {
    this.children.forEach(c => {
      if (!all.has(c)) {
        all.add(c)
        c.getAllChildren(all)
      }
    })

    return all
  }
}
export function dataGrachTraverse(
  source: DataGraphNode | DataGraphNode[],
  callback: (n: DataGraphNode, ancestors: DataGraphNode[]) => boolean | void
) {
  function task(current: DataGraphNode, ancestors: DataGraphNode[] = []) {
    const r = callback(current, ancestors)
    if (r === false) {
      return false
    }
    for (const v1 of current.children) {
      // prevent traverse circle
      if (ancestors.includes(v1)) {
        continue
      }
      const r = task(v1, ancestors.concat(current))
      if (r === false) {
        return false
      }
    }
  }

  for (const s of [].concat(source)) {
    const r = task(s)
    if (r === false) {
      break
    }
  }
}

function findReactiveDenpendencies(ancestors: DataGraphNode[]) {
  if (ancestors.length >= 2) {
    let r = new Set<DataGraphNode>()
    for (let index = ancestors.length - 1; index > 0; index--) {
      const last = ancestors[index]
      const prevLast = ancestors[index - 1]
      if (prevLast.toGet.has(last)) {
        r.add(prevLast)
      } else {
        break
      }
    }
    return r
  }
}

export function getDependencies(rootNodes: Set<DataGraphNode>, id: number) {
  const dependencies = new Set<DataGraphNode>()
  dataGrachTraverse([...rootNodes], (n, a) => {
    if (n.id === id) {
      const deps = findReactiveDenpendencies(a.concat(n))
      deps?.forEach(dn => {
        dependencies.add(dn)
      })
    }
  })
  return dependencies
}

function getTypeFromContextDeps(contextDeps: THookDeps, index: number) {
  const r = contextDeps.find(v => v[1] === index)
  return r?.[0] || 'h'
}

export function mapGraph(s: Set<DataGraphNode>) {
  const m = new Map<number, DataGraphNode>()
  s.forEach(n => {
    m.set(n.id, n)
  })
  return m
}

export function mapGraphSetToIds(s: Set<DataGraphNode>) {
  return new Set([...s].map(n => n.id))
}

export function getNextNodes(current: DataGraphNode) {
  return current.getAllChildren()
}

export function getPrevNodes(
  rootNodes: Set<DataGraphNode>,
  current: { id: number }
) {
  const prevNodes = new Set<DataGraphNode>()
  dataGrachTraverse([...rootNodes], (n, ancestor) => {
    if (n.id === current.id) {
      ancestor.forEach(an => {
        prevNodes.add(an)
      })
    }
  })
  return prevNodes
}

function getPrevNodesWithFilter(
  rootNodes: Set<DataGraphNode>,
  current: { id: number },
  filter: (ancestors: DataGraphNode[]) => DataGraphNode[]
) {
  const prevNodes = new Set<DataGraphNode>()
  dataGrachTraverse([...rootNodes], (n, ancestor) => {
    if (n.id === current.id) {
      const onlyGetChain = filter(ancestor.concat(n))
      onlyGetChain.forEach(gn => {
        if (gn.id !== current.id) {
          prevNodes.add(gn)
        }
      })
    }
  })
  return prevNodes
}
export function getDependentPrevNodes(
  rootNodes: Set<DataGraphNode>,
  current: { id: number }
) {
  return getPrevNodesWithFilter(rootNodes, current, arr => {
    const len = arr.length
    let i = len - 1
    while (i >= 0) {
      const last = arr[i]
      const penultimate = arr[i - 1]
      if (!penultimate || !penultimate.toGet.has(last)) {
        break
      }
      i--
    }
    return arr.slice(i)
  })
}
export function getDependentPrevNodesWithBlock(
  rootNodes: Set<DataGraphNode>,
  current: { id: number },
  blocks = new Set<DataGraphNode>()
) {
  return getPrevNodesWithFilter(rootNodes, current, arr =>
    arr.some(v => blocks.has(v)) ? [] : arr
  )
}
export function getShallowDependentPrevNodes(
  rootNodes: Set<DataGraphNode>,
  current: { id: number }
) {
  return getPrevNodesWithFilter(rootNodes, current, arr =>
    arr.length >= 2 ? [arr[arr.length - 2]] : []
  )
}

function getInfluencedNextNodesWithDependence(
  rootNodes: Set<DataGraphNode>,
  current: { id: number },
  getDependent: (
    current: { id: number },
    source: DataGraphNode
  ) => Set<DataGraphNode>
) {
  const nextNodes = new Set<DataGraphNode>()

  dataGrachTraverse([...rootNodes], (n, ancestor) => {
    if (n.id === current.id) {
      const allChildren = n.getAllChildren()
      allChildren.forEach(cn => {
        nextNodes.add(cn)
        const currentDependentNodes = getDependent(cn, n)
        currentDependentNodes.forEach(ccn => {
          nextNodes.add(ccn)
        })
      })
      return false
    }
  })

  return nextNodes
}

export function getInfluencedNextNodes(
  rootNodes: Set<DataGraphNode>,
  current: { id: number }
) {
  return getInfluencedNextNodesWithDependence(
    rootNodes,
    current,
    (current, trigger) => {
      return getDependentPrevNodesWithBlock(
        rootNodes,
        current,
        new Set([trigger])
      )
    }
  )
}

export function getShallowInfluencedNextNodes(
  rootNodes: Set<DataGraphNode>,
  current: { id: number }
) {
  return getInfluencedNextNodesWithDependence(
    rootNodes,
    current,
    (current, trigger) => {
      return getShallowDependentPrevNodes(rootNodes, current)
    }
  )
}

export function constructDataGraph(contextDeps: THookDeps) {
  const nodesMap = new Map<number, DataGraphNode>()
  const hasParentIds = new Set<number>()
  contextDeps.forEach(([hookType, id, get, set]) => {
    let current = nodesMap.get(id)
    if (!current) {
      current = new DataGraphNode(id, hookType)
      nodesMap.set(id, current)
    }

    get?.forEach(idOrArr => {
      if (Array.isArray(idOrArr)) {
        throw new Error(
          `[getRelatedIndexes] 1 not support compose. transform it to hook index before calling id=${id}`
        )
      } else {
        let parent = nodesMap.get(idOrArr)
        if (!parent) {
          parent = new DataGraphNode(
            idOrArr,
            getTypeFromContextDeps(contextDeps, idOrArr)
          )
          nodesMap.set(idOrArr, parent)
        }
        hasParentIds.add(current.id)
        parent.addToGet(current)
      }
    })
    set?.forEach(idOrArr => {
      if (Array.isArray(idOrArr)) {
        throw new Error(
          `[getRelatedIndexes] 2 not support compose. transform it to hook index before calling id=${id}`
        )
      } else {
        let child = nodesMap.get(idOrArr)
        if (!child) {
          child = new DataGraphNode(
            idOrArr,
            getTypeFromContextDeps(contextDeps, idOrArr)
          )
          nodesMap.set(idOrArr, child)
        }
        hasParentIds.add(child.id)
        if (child.type === 'ic') {
          current.addToCall(child)
        } else {
          current.addToSet(child)
        }
      }
    })
  })
  const rootNodes = new Set<DataGraphNode>()
  for (const [id, n] of nodesMap) {
    if (!hasParentIds.has(id)) {
      rootNodes.add(n)
    }
  }
  return rootNodes
}

export function getRelatedIndexes(
  index: number[] | number,
  contextDeps: THookDeps
) {
  const indexArr = [].concat(index)

  const deps = new Set<number>(indexArr)

  const rootNodes = constructDataGraph(contextDeps)

  indexArr.forEach(index => {
    const nodes1 = getInfluencedNextNodes(rootNodes, { id: index })
    const nodes2 = getDependentPrevNodes(rootNodes, { id: index })
    ;[nodes1, nodes2].forEach(s => {
      s.forEach(n => {
        deps.add(n.id)
      })
    })
  })

  return deps
}

export function getShallowRelatedIndexes(
  index: number[] | number,
  contextDeps: THookDeps
) {
  const indexArr = [].concat(index)

  const deps = new Set<number>(indexArr)

  const rootNodes = constructDataGraph(contextDeps)

  indexArr.forEach(index => {
    const nodes1 = getShallowInfluencedNextNodes(rootNodes, { id: index })
    const nodes2 = getShallowDependentPrevNodes(rootNodes, { id: index })
    ;[nodes1, nodes2].forEach(s => {
      s.forEach(n => {
        deps.add(n.id)
      })
    })
  })

  return deps
}

export const tttcorevv = 5
