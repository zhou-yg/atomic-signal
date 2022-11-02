import { IHookContext } from './util'
import type { CurrentRunnerScope } from './signal'

export type TCacheFrom = 'cookie' | 'regularKV' // | 'redis' | 'localStorage' | 'sessionStorage'

export interface IRunningContext {
  cookies: {
    set: (name: string, value?: string | null, opts?: any) => void
    get: (name: string, opts?: any) => string | undefined
  }
}

const plugins: {
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
