import { IDiff, IHookContext } from './util'
import type { CurrentRunnerScope } from './signal'

export type IModelCreateData =
  | Omit<IModelData, 'where'>
  | Omit<IModelData, 'where'>[]

export interface IModelData {
  where: { id: number }
  data: {
    [k: string]:
      | any
      | {
          connect?: { id: number }
          create?: IModelData
        }
  }
  include?: Record<string, boolean>
}

interface IQuerySelect {
  [k: string]:
    | boolean
    | {
        select: IQuerySelect
      }
}

interface IQueryInclude {
  [k: string]:
    | boolean
    | {
        include: IQueryInclude
      }
}

export interface IQueryWhere {
  where?: {
    [k: string]: any
  }
  skip?: number
  take?: number
  include?: IQueryInclude
  select?: IQuerySelect
  orderBy?: {
    [k: string]: 'desc' | 'asc'
  }
  cursor?: {
    id?: number
  }
}
export interface IModelQuery {
  entity: string
  query: IQueryWhere
}

export type TCacheFrom = 'cookie' | 'regularKV' // | 'redis' | 'localStorage' | 'sessionStorage'

export interface IRunningContext {
  cookies: {
    set: (name: string, value?: string | null, opts?: any) => void
    get: (name: string, opts?: any) => string | undefined
  }
}

const plugins: {
  Model?: {
    find(
      from: string,
      entity: string,
      query: IModelQuery['query']
    ): Promise<any>
    update(from: string, entity: string, query: IModelData): Promise<number[]>
    create(from: string, entity: string, data: IModelCreateData): Promise<any>
    remove(
      from: string,
      entity: string,
      data: Omit<IModelData, 'data'>
    ): Promise<number[]>
    executeDiff(from: string, entity: string, d: IDiff): Promise<void>
  }
  Cache?: {
    getValue<T>(
      scope: CurrentRunnerScope,
      k: string,
      from: TCacheFrom
    ): Promise<T | undefined>
    setValue<T>(
      scope: CurrentRunnerScope,
      k: string,
      value: T,
      from: TCacheFrom
    ): Promise<void>
    clearValue(scope: CurrentRunnerScope, k: string, from: TCacheFrom): void
  }
  Context?: {
    postDiffToServer(entity: string, d: IDiff): Promise<void>
    postComputeToServer(c: IHookContext): Promise<IHookContext>
    postQueryToServer(c: IHookContext): Promise<IHookContext>
  }
  GlobalRunning?: {
    setCurrent(
      scope: CurrentRunnerScope,
      runningApi: IRunningContext | null
    ): void
    getCurrent(scope: CurrentRunnerScope): IRunningContext | null
  }
  cookie?: {
    get<T>(scope: CurrentRunnerScope, k: string): Promise<T | undefined>
    set<T>(scope: CurrentRunnerScope, k: string, value: T): Promise<void>
    clear(scope: CurrentRunnerScope, k: string): void
  }
  regularKV?: {
    get<T>(scope: CurrentRunnerScope, k: string): Promise<T | undefined>
    set<T>(scope: CurrentRunnerScope, k: string, value: T): Promise<void>
    clear(scope: CurrentRunnerScope, k: string): void
  }
} = {}

type IPlugins = typeof plugins

type TPluginKey = keyof IPlugins

/**
 * provide a default CachePlugin for distribution different cahce type
 */
const defaultCachePlugin: IPlugins['Cache'] = {
  async getValue(scope, k, from) {
    return getPlugin(from).get(scope, k)
  },
  setValue(scope, k, v, from) {
    return getPlugin(from).set(scope, k, v)
  },
  clearValue(scope, k, from) {
    getPlugin(from).clear(scope, k)
  }
}

loadPlugin('Cache', defaultCachePlugin)

export function getPlugin<T extends TPluginKey>(k: T) {
  const plugin = plugins[k]
  if (!plugin) {
    throw new Error(`[getPlugin] name=${k} is not found`)
  }
  return plugin as Exclude<IPlugins[T], undefined>
}

export function loadPlugin<T extends TPluginKey>(k: T, p: IPlugins[T]) {
  plugins[k] = p
}
