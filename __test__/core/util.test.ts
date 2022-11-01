import {
  calculateDiff,
  checkQueryWhere,
  constructDataGraph,
  dataGrachTraverse,
  DataGraphNode,
  get,
  getDependentPrevNodes,
  getInfluencedNextNodes,
  getPrevNodes,
  getRelatedIndexes,
  getShallowRelatedIndexes,
  mapGraph,
  mapGraphSetToIds,
  set,
  THookDeps
} from '../../src/index'
import { produceWithPatches, enablePatches } from 'immer'

enablePatches()

describe('util', () => {
  describe('calculate diff', () => {
    it('object add property', () => {
      const origin = { num0: null }
      const [r, patches] = produceWithPatches(origin, (d: any) => {
        d.num0 = 0
        d.num1 = 1
      })

      const diff = calculateDiff(origin, patches)
      expect(diff.update).toEqual([
        {
          source: { num0: null },
          value: {
            num0: 0,
            num1: 1
          },
          currentFieldPath: ''
        }
      ])
      expect(diff.create).toEqual([])
      expect(diff.remove).toEqual([])
    })
    it('object add nested obj', () => {
      const origin = {}
      const [r, patches] = produceWithPatches(origin, (d: any) => {
        d.child = {
          num: 0
        }
        d.child.child2 = {
          num2: 2
        }
      })

      const diff = calculateDiff(origin, patches)
      expect(diff.update).toEqual([])
      expect(diff.create).toEqual([
        {
          source: origin,
          value: {
            num: 0,
            child2: {
              num2: 2
            }
          },
          currentFieldPath: 'child'
        }
      ])
      expect(diff.remove).toEqual([])
    })
    it('object modify property in nested obj', () => {
      const origin = {
        child: {
          num: 0,
          num1: 1
        }
      }
      const [r, patches] = produceWithPatches(origin, (d: any) => {
        const { child } = d
        child.num0 = 1
        delete child.num1
      })

      const diff = calculateDiff(origin, patches)
      expect(diff.update).toEqual([
        {
          source: {
            num: 0,
            num1: 1
          },
          value: {
            num0: 1,
            num1: null
          },

          currentFieldPath: 'child'
        }
      ])
      expect(diff.create).toEqual([])
      expect(diff.remove).toEqual([])
    })
    it('object remove property', () => {
      const origin = { num: 0 }
      const [r, patches] = produceWithPatches(origin, (d: any) => {
        delete d.num
      })

      const diff = calculateDiff(origin, patches)
      expect(diff.update).toEqual([
        {
          source: { num: 0 },
          value: {
            num: null
          },
          currentFieldPath: ''
        }
      ])
      expect(diff.create).toEqual([])
      expect(diff.remove).toEqual([])
    })
    it('object remove nested obj', () => {
      const origin = { child: { num: '0' } }
      const [r, patches] = produceWithPatches(origin, (d: any) => {
        d.child.num = 'modified before remove'
        delete d.child
      })

      const diff = calculateDiff(origin, patches)
      expect(diff.update).toEqual([])
      expect(diff.create).toEqual([])
      expect(diff.remove).toEqual([
        {
          source: origin,
          value: {
            num: '0'
          },
          currentFieldPath: 'child'
        }
      ])
    })
    it('array', () => {
      const origin = [{ num0: null }]
      const [r, patches] = produceWithPatches(origin, (d: any) => {
        d[0].num0 = 0
        d[0].num1 = 1
        d.push({
          num2: 2
        })
      })

      const diff = calculateDiff(origin, patches)
      expect(diff.update).toEqual([
        {
          source: origin[0],
          value: {
            num0: 0,
            num1: 1
          },
          currentFieldPath: ''
        }
      ])
      expect(diff.create).toEqual([
        {
          source: origin,
          value: {
            num2: 2
          },
          currentFieldPath: ''
        }
      ])
      expect(diff.remove).toEqual([])
    })
    it('array nested object', () => {
      const origin = [{ num0: null, child: { num0: null } }]
      const [r, patches] = produceWithPatches(origin, (d: any) => {
        const { child } = d[0]
        child.num0 = 0
        child.num1 = 1
      })

      const diff = calculateDiff(origin, patches)
      expect(diff.update).toEqual([
        {
          source: origin[0].child,
          value: {
            num0: 0,
            num1: 1
          },
          currentFieldPath: 'child'
        }
      ])
      expect(diff.create).toEqual([])
      expect(diff.remove).toEqual([])
    })
    it('array push to object.child', () => {
      const origin = [{ num0: null, child: [] }]
      const [r, patches] = produceWithPatches(origin, (d: any) => {
        const { child } = d[0]
        child.push({
          num2: 2
        })
      })

      const diff = calculateDiff(origin, patches)
      expect(diff.update).toEqual([])
      expect(diff.create).toEqual([
        {
          source: origin[0].child,
          value: {
            num2: 2
          },
          currentFieldPath: 'child'
        }
      ])
      expect(diff.remove).toEqual([])
    })
    it('array remove one element', () => {
      const origin = [
        { num0: null, child: [{ num0: 1 }] },
        { num0: 1 },
        { num0: 2 }
      ]
      const [r, patches] = produceWithPatches(origin, (d: any) => {
        d.splice(1, 1)
      })

      const diff = calculateDiff(origin, patches)
      expect(diff.update).toEqual([])
      expect(diff.create).toEqual([])
      expect(diff.remove).toEqual([
        {
          source: origin,
          value: {
            num0: 1
          },
          currentFieldPath: ''
        }
      ])
    })
    it('array remove: shift element', () => {
      const origin = [
        { num0: null, child: [{ num0: 1 }] },
        { num0: 1 },
        { num0: 2 }
      ]
      const [r, patches] = produceWithPatches(origin, (d: any) => {
        d.shift()
      })

      const diff = calculateDiff(origin, patches)
      expect(diff.update).toEqual([])
      expect(diff.create).toEqual([])
      expect(diff.remove).toEqual([
        {
          source: origin,
          value: { num0: null, child: [{ num0: 1 }] },
          currentFieldPath: ''
        }
      ])
    })
    it('array remove: pop element', () => {
      const origin = [
        { num0: null, child: [{ num0: 1 }] },
        { num0: 1 },
        { num0: 2 }
      ]
      const [r, patches] = produceWithPatches(origin, (d: any) => {
        d.pop()
      })

      const diff = calculateDiff(origin, patches)
      expect(diff.update).toEqual([])
      expect(diff.create).toEqual([])
      expect(diff.remove).toEqual([
        {
          source: origin,
          value: { num0: 2 },
          currentFieldPath: ''
        }
      ])
    })
    it('array remove multi elements tail', () => {
      const origin = [
        { num0: null, child: [{ num0: 1 }] },
        { num0: 1 },
        { num0: 2 }
      ]
      const [r, patches] = produceWithPatches(origin, (d: any) => {
        d.splice(1, 2)
      })

      const diff = calculateDiff(origin, patches)
      expect(diff.update).toEqual([])
      expect(diff.create).toEqual([])
      expect(diff.remove).toEqual([
        {
          source: origin,
          value: {
            num0: 1
          },
          currentFieldPath: ''
        },
        {
          source: origin,
          value: {
            num0: 2
          },
          currentFieldPath: ''
        }
      ])
    })
    it('array remove multi elements not tail & unshift', () => {
      const origin = [
        // 1
        { num0: null, child: [{ num0: 1 }] },
        { num0: 1 },
        { num0: 2 },
        { num0: 3 }
      ]
      const [r, patches] = produceWithPatches(origin, (d: any) => {
        d[0].num0 = 0
        d.unshift(1)
        d.splice(1, 2)
      })

      const diff = calculateDiff(origin, patches)
      expect(diff.update).toEqual([])
      expect(diff.create).toEqual([])
      expect(diff.remove).toEqual([
        {
          source: origin,
          value: origin[0],
          currentFieldPath: ''
        },
        {
          source: origin,
          value: origin[1],
          currentFieldPath: ''
        }
      ])
    })
    it('array remove multi elements not tail & push', () => {
      const origin = [
        // 1
        { num0: null, child: [{ num0: 1 }] },
        { num0: 1 },
        { num0: 2 },
        { num0: 3 }
      ]
      const [r, patches] = produceWithPatches(origin, (d: any) => {
        d[0].num0 = 0
        d.splice(1, 2)
        d.push(1)
      })

      const diff = calculateDiff(origin, patches)
      expect(diff.update).toEqual([
        {
          source: origin[0],
          value: {
            num0: 0
          },
          currentFieldPath: ''
        }
      ])
      expect(diff.create).toEqual([])
      expect(diff.remove).toEqual([
        {
          source: origin,
          value: {
            num0: 1
          },
          currentFieldPath: ''
        },
        {
          source: origin,
          value: {
            num0: 2
          },
          currentFieldPath: ''
        }
      ])
    })
    it('array remove child one element', () => {
      const origin = [
        { num0: null, child: [{ num0: 1 }, { num0: 2 }, { num0: 3 }] },
        { num0: 1 },
        { num0: 2 }
      ]
      const [r, patches] = produceWithPatches(origin, (d: any) => {
        d[0].child.splice(1, 1)
      })

      const diff = calculateDiff(origin, patches)
      expect(diff.update).toEqual([])
      expect(diff.create).toEqual([])
      expect(diff.remove).toEqual([
        {
          source: origin[0].child,
          value: {
            num0: 2
          },
          currentFieldPath: 'child'
        }
      ])
    })
    it('array remove child shift element', () => {
      const origin = [
        { num0: null, child: [{ num0: 1 }, { num0: 2 }, { num0: 2 }] },
        { num0: 1 },
        { num0: 2 }
      ]
      const [r, patches] = produceWithPatches(origin, (d: any) => {
        d[0].child.shift()
      })

      const diff = calculateDiff(origin, patches)
      expect(diff.update).toEqual([])
      expect(diff.create).toEqual([])
      expect(diff.remove).toEqual([
        {
          source: origin[0].child,
          value: {
            num0: 1
          },
          currentFieldPath: 'child'
        }
      ])
    })
    it('array remove all', () => {
      const origin = [{ num0: null }, { num0: 1 }, { num0: 2 }]
      const [r, patches] = produceWithPatches(origin, (d: any) => {
        d.splice(0, d.length)
      })

      const diff = calculateDiff(origin, patches)
      expect(diff.update).toEqual([])
      expect(diff.create).toEqual([])
      expect(diff.remove).toEqual([
        {
          source: origin,
          value: { num0: null },
          currentFieldPath: ''
        },
        {
          source: origin,
          value: { num0: 1 },
          currentFieldPath: ''
        },
        {
          source: origin,
          value: { num0: 2 },
          currentFieldPath: ''
        }
      ])
    })
  })
  it('check invalid query`s where', () => {
    const r2 = checkQueryWhere({
      a: 2,
      b: 1
    })
    const r4 = checkQueryWhere({
      a: 2,
      b: 1,
      c: {
        a: 3
      }
    })
    const r6 = checkQueryWhere({
      a: 2,
      b: 1,
      c: {
        a: 3
      },
      d: [1, 2]
    })
    expect([r2, r4, r6]).toEqual([true, true, true])

    const r1 = checkQueryWhere({
      a: undefined,
      b: 1
    })
    const r3 = checkQueryWhere({
      a: 2,
      b: 1,
      c: {
        a: undefined
      }
    })
    const r5 = checkQueryWhere({
      a: 2,
      b: 1,
      c: {
        a: 3
      },
      d: [undefined, 2]
    })
    expect([r1, r3, r5]).toEqual([false, false, false])
  })
  describe('constructDataGraph', () => {
    it('simple', () => {
      const deps:THookDeps = [
        ['ic', 0, [1,2], [3,4,5]],
        ['ic', 3, [5,6], [7]],
        ['h', 8, [7]]
      ]
      const rootNodes = constructDataGraph(deps)
      const rootMaps = mapGraph(rootNodes)

      const n = rootMaps.get(1).getAllChildren()
      expect(mapGraphSetToIds(n)).toEqual(new Set([0, 3,4,5,7, 8]))

      const n2 = rootMaps.get(2).getAllChildren()
      expect(mapGraphSetToIds(n2)).toEqual(new Set([0, 3,4,5,7, 8]))

      const n6 = rootMaps.get(6).getAllChildren()
      expect(mapGraphSetToIds(n6)).toEqual(new Set([3, 7, 8]))

      const prevNodes1 = getPrevNodes(rootNodes, { id: 1 })
      expect(mapGraphSetToIds(prevNodes1)).toEqual(new Set([]))

      const prevNodes0 = getPrevNodes(rootNodes, { id: 0 })
      expect(mapGraphSetToIds(prevNodes0)).toEqual(new Set([1, 2]))

      const prevNodes8 = getPrevNodes(rootNodes, { id: 8 })
      expect(mapGraphSetToIds(prevNodes8)).toEqual(new Set([7, 3, 5, 6, 0, 1, 2]))
    })
    it('h called ic', () => {
      const deps:THookDeps = [
        ['h', 0, [1], [2]],
        ['ic', 2, [3, 4], [5]],
        ['h', 6, [0]],
        ['h', 7, [5]],
      ]
      const rootNodes = constructDataGraph(deps)
      const rootMaps = mapGraph(rootNodes)

      const n = rootMaps.get(1).getAllChildren()
      expect(mapGraphSetToIds(n)).toEqual(new Set([0, 6, 2, 5, 7]))

      const n3 = rootMaps.get(3).getAllChildren()
      expect(mapGraphSetToIds(n3)).toEqual(new Set([2, 5, 7]))
    })
    it('dependent chain', () => {
      const deps:THookDeps = [
        ['h', 0, [1]],
        ['h', 2, [0]],
        ['ic', 3, [4,5], [0, 6]]
      ]
      const rootNodes = constructDataGraph(deps)
      const rootMaps = mapGraph(rootNodes)
      
      const n0 = getDependentPrevNodes(rootNodes, { id: 0 })
      expect(mapGraphSetToIds(n0)).toEqual(new Set([1]))
    })
    it('dependent chain: h call ic', () => {
      const deps:THookDeps = [
        ['ic', 0, [1], [2]],
        ['h', 3, [4], [0]],
        ['h', 5, [3]]
      ]
      const rootNodes = constructDataGraph(deps)
      const rootMaps = mapGraph(rootNodes)
      
      const n0 = getDependentPrevNodes(rootNodes, { id: 0 })
      expect(mapGraphSetToIds(n0)).toEqual(new Set([1]))
    })

    it('influence chain 1', () => {
      const deps: THookDeps = [
        ['h', 1, [0, 5], [2]],
        ['ic', 2, [3], [4]],
        ['h', 6, [1]],
        ['h', 3, [7]]
      ]      
      const rootNodes = constructDataGraph(deps)
      const rootMaps = mapGraph(rootNodes)
      
      const n1 = getInfluencedNextNodes(rootNodes, { id: 1 })
      expect(mapGraphSetToIds(n1)).toEqual(new Set([2, 3, 4, 7, 6]))
    })
    it('influence chain 2', () => {
      const deps: THookDeps = [
        ['h', 1, [0, 5], [2]],
        ['ic', 2, [3], [4]],
        ['h', 3, [7]]
      ]      
      const rootNodes = constructDataGraph(deps)
      const rootMaps = mapGraph(rootNodes)
      
      const n1 = getInfluencedNextNodes(rootNodes, { id: 1 })
      expect(mapGraphSetToIds(n1)).toEqual(new Set([2, 3, 4, 7]))
    })
  })

  describe('getRelatedIndexes', () => {
    it('simple', () => {
      const deps: THookDeps = [
        ['h', 1, [0, 5], [2]],
        ['ic', 2, [3], [4]],
        ['h', 3, [7]]
      ]      
      const rootNodes = constructDataGraph(deps)
      const rootMaps = mapGraph(rootNodes)
      
      const r1 = getRelatedIndexes(1, deps)
  
      expect(r1).toEqual(new Set([1, 0, 5, 2,3,4,7]))
    })
    it('ic call ic and h', () => {
      const deps: THookDeps = [
        ['h', 1, [0, 5], [2]],
        ['ic', 2, [3], [4]],
        ['h', 6, [1, 8]],
        ['h', 3, [7]]
      ]      
      const rootNodes = constructDataGraph(deps)
      const rootMaps = mapGraph(rootNodes)
      
      const n1 = getRelatedIndexes(1, deps)
      expect((n1)).toEqual(new Set([1, 0, 5, 2,3,4,7, 6, 8]))
    })
  })

  describe('getShallowRelatedIndexes', () => {
    it('ic call ic and h', () => {
      const deps: THookDeps = [
        ['h', 1, [0, 5], [2]],
        ['ic', 2, [3], [4]],
        ['h', 6, [1, 8]],
        ['h', 3, [7]]
      ]      
      const rootNodes = constructDataGraph(deps)
      const rootMaps = mapGraph(rootNodes)
      
      const n6 = getRelatedIndexes(6, deps)
      expect((n6)).toEqual(new Set([6, 1, 0, 5, 8]))

      const sn6 = getShallowRelatedIndexes(6, deps)
      expect((sn6)).toEqual(new Set([6, 1, 8]))
    })
  })

  describe('set/get', () => {
    it('set and get', () => {
      const obj = { a: [0, 1] }
      set(obj, ['a', '1'], 33)

      expect(obj.a[1]).toBe(33)

      const v = get(obj, ['a', 1])
      expect(v).toBe(33)
    })
  })
})
