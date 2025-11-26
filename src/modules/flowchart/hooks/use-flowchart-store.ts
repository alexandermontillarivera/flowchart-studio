import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { v4 as uuid } from 'uuid'
import { FlowNode, Connection, CanvasState, ShapeType, Position } from '@/interfaces/flowchart'

interface HistoryState {
  nodes: FlowNode[]
  connections: Connection[]
}

interface FlowchartStore {
  nodes: FlowNode[]
  connections: Connection[]
  selectedNodeId: string | null
  selectedConnectionId: string | null
  canvas: CanvasState
  isDragging: boolean
  isConnecting: boolean
  connectingFrom: { nodeId: string; anchor: 'top' | 'right' | 'bottom' | 'left' } | null
  isViewMode: boolean
  clipboard: FlowNode | null

  past: HistoryState[]
  future: HistoryState[]

  addNode: (type: ShapeType, position: Position) => void
  updateNode: (id: string, updates: Partial<FlowNode>) => void
  deleteNode: (id: string) => void
  selectNode: (id: string | null) => void

  addConnection: (
    from: string,
    to: string,
    fromAnchor: 'top' | 'right' | 'bottom' | 'left',
    toAnchor: 'top' | 'right' | 'bottom' | 'left'
  ) => void
  updateConnection: (id: string, updates: Partial<Connection>) => void
  deleteConnection: (id: string) => void
  selectConnection: (id: string | null) => void

  setZoom: (zoom: number) => void
  setPan: (pan: Position) => void
  setDragging: (isDragging: boolean) => void
  startConnecting: (nodeId: string, anchor: 'top' | 'right' | 'bottom' | 'left') => void
  stopConnecting: () => void

  clearSelection: () => void
  deleteSelected: () => void
  loadFromStorage: () => void
  setViewMode: (isViewMode: boolean) => void
  toggleViewMode: () => void
  exportData: () => string
  importData: (data: string) => boolean
  centerOnContent: (viewportWidth: number, viewportHeight: number) => void

  copySelectedNode: () => void
  pasteNode: () => void

  undo: () => void
  redo: () => void
  canUndo: () => boolean
  canRedo: () => boolean
  saveToHistory: () => void
}

const DEFAULT_SIZES: Record<ShapeType, { width: number; height: number }> = {
  'start-end': { width: 140, height: 60 },
  process: { width: 160, height: 80 },
  decision: { width: 140, height: 140 },
  data: { width: 160, height: 80 },
  document: { width: 160, height: 100 },
  'predefined-process': { width: 160, height: 80 },
  connector: { width: 50, height: 50 },
  delay: { width: 120, height: 60 },
  'manual-input': { width: 160, height: 80 },
  preparation: { width: 160, height: 70 },
  database: { width: 100, height: 120 },
  display: { width: 160, height: 80 },
  'manual-operation': { width: 160, height: 80 },
  'loop-limit': { width: 160, height: 80 },
  merge: { width: 100, height: 100 },
  or: { width: 80, height: 80 },
  'summing-junction': { width: 80, height: 80 },
  collate: { width: 80, height: 100 },
  sort: { width: 100, height: 100 },
  'stored-data': { width: 140, height: 80 },
  'internal-storage': { width: 120, height: 100 },
}

const MAX_HISTORY = 50

export const useFlowchartStore = create<FlowchartStore>()(
  persist(
    (set, get) => ({
      nodes: [],
      connections: [],
      selectedNodeId: null,
      selectedConnectionId: null,
      canvas: { zoom: 1, pan: { x: 0, y: 0 } },
      isDragging: false,
      isConnecting: false,
      connectingFrom: null,
      isViewMode: false,
      clipboard: null,

      past: [],
      future: [],

      saveToHistory: () => {
        const { nodes, connections, past } = get()
        const newPast = [
          ...past,
          {
            nodes: JSON.parse(JSON.stringify(nodes)),
            connections: JSON.parse(JSON.stringify(connections)),
          },
        ]
        if (newPast.length > MAX_HISTORY) newPast.shift()
        set({ past: newPast, future: [] })
      },

      undo: () => {
        const { past, nodes, connections } = get()
        if (past.length === 0) return

        const previous = past[past.length - 1]
        const newPast = past.slice(0, -1)

        set({
          past: newPast,
          future: [
            {
              nodes: JSON.parse(JSON.stringify(nodes)),
              connections: JSON.parse(JSON.stringify(connections)),
            },
            ...get().future,
          ],
          nodes: previous.nodes,
          connections: previous.connections,
          selectedNodeId: null,
          selectedConnectionId: null,
        })
      },

      redo: () => {
        const { future, nodes, connections } = get()
        if (future.length === 0) return

        const next = future[0]
        const newFuture = future.slice(1)

        set({
          future: newFuture,
          past: [
            ...get().past,
            {
              nodes: JSON.parse(JSON.stringify(nodes)),
              connections: JSON.parse(JSON.stringify(connections)),
            },
          ],
          nodes: next.nodes,
          connections: next.connections,
          selectedNodeId: null,
          selectedConnectionId: null,
        })
      },

      canUndo: () => get().past.length > 0,
      canRedo: () => get().future.length > 0,

      addNode: (type, position) => {
        get().saveToHistory()
        const size = DEFAULT_SIZES[type]
        const newNode: FlowNode = {
          id: uuid(),
          type,
          position,
          size,
          label: '',
          connections: [],
        }
        set((state) => ({ nodes: [...state.nodes, newNode] }))
      },

      updateNode: (id, updates) => {
        set((state) => ({
          nodes: state.nodes.map((node) => (node.id === id ? { ...node, ...updates } : node)),
        }))
      },

      deleteNode: (id) => {
        get().saveToHistory()
        set((state) => ({
          nodes: state.nodes.filter((node) => node.id !== id),
          connections: state.connections.filter((conn) => conn.from !== id && conn.to !== id),
          selectedNodeId: state.selectedNodeId === id ? null : state.selectedNodeId,
        }))
      },

      selectNode: (id) => {
        set({ selectedNodeId: id, selectedConnectionId: null })
      },

      addConnection: (from, to, fromAnchor, toAnchor) => {
        if (from === to) return
        const exists = get().connections.some((conn) => conn.from === from && conn.to === to)
        if (exists) return

        get().saveToHistory()
        const newConnection: Connection = {
          id: uuid(),
          from,
          to,
          fromAnchor,
          toAnchor,
        }
        set((state) => ({ connections: [...state.connections, newConnection] }))
      },

      updateConnection: (id, updates) => {
        set((state) => ({
          connections: state.connections.map((conn) =>
            conn.id === id ? { ...conn, ...updates } : conn
          ),
        }))
      },

      deleteConnection: (id) => {
        get().saveToHistory()
        set((state) => ({
          connections: state.connections.filter((conn) => conn.id !== id),
          selectedConnectionId:
            state.selectedConnectionId === id ? null : state.selectedConnectionId,
        }))
      },

      selectConnection: (id) => {
        set({ selectedConnectionId: id, selectedNodeId: null })
      },

      setZoom: (zoom) => {
        const clampedZoom = Math.max(0.1, Math.min(3, zoom))
        set((state) => ({ canvas: { ...state.canvas, zoom: clampedZoom } }))
      },

      setPan: (pan) => {
        set((state) => ({ canvas: { ...state.canvas, pan } }))
      },

      setDragging: (isDragging) => {
        set({ isDragging })
      },

      startConnecting: (nodeId, anchor) => {
        set({ isConnecting: true, connectingFrom: { nodeId, anchor } })
      },

      stopConnecting: () => {
        set({ isConnecting: false, connectingFrom: null })
      },

      clearSelection: () => {
        set({ selectedNodeId: null, selectedConnectionId: null })
      },

      deleteSelected: () => {
        const { selectedNodeId, selectedConnectionId, deleteNode, deleteConnection } = get()
        if (selectedNodeId) deleteNode(selectedNodeId)
        if (selectedConnectionId) deleteConnection(selectedConnectionId)
      },

      copySelectedNode: () => {
        const { selectedNodeId, nodes } = get()
        if (!selectedNodeId) return

        const node = nodes.find((n) => n.id === selectedNodeId)
        if (node) {
          set({ clipboard: JSON.parse(JSON.stringify(node)) })
        }
      },

      pasteNode: () => {
        const { clipboard } = get()
        if (!clipboard) return

        get().saveToHistory()
        const newNode: FlowNode = {
          ...JSON.parse(JSON.stringify(clipboard)),
          id: uuid(),
          position: {
            x: clipboard.position.x + 30,
            y: clipboard.position.y + 30,
          },
          connections: [],
        }
        set((state) => ({
          nodes: [...state.nodes, newNode],
          selectedNodeId: newNode.id,
          clipboard: { ...clipboard, position: newNode.position },
        }))
      },

      loadFromStorage: () => {},

      setViewMode: (isViewMode) => {
        set({ isViewMode, selectedNodeId: null, selectedConnectionId: null })
      },

      toggleViewMode: () => {
        const { isViewMode } = get()
        set({ isViewMode: !isViewMode, selectedNodeId: null, selectedConnectionId: null })
      },

      exportData: () => {
        const { nodes, connections, canvas } = get()
        return JSON.stringify({ nodes, connections, canvas }, null, 2)
      },

      importData: (data) => {
        try {
          const parsed = JSON.parse(data)
          if (parsed.nodes && Array.isArray(parsed.nodes)) {
            set({
              nodes: parsed.nodes,
              connections: parsed.connections || [],
              canvas: parsed.canvas || { zoom: 1, pan: { x: 0, y: 0 } },
              selectedNodeId: null,
              selectedConnectionId: null,
            })
            return true
          }
          return false
        } catch {
          return false
        }
      },

      centerOnContent: (viewportWidth, viewportHeight) => {
        const { nodes, canvas } = get()
        if (nodes.length === 0) return

        let minX = Infinity
        let maxX = -Infinity
        let minY = Infinity
        let maxY = -Infinity

        nodes.forEach((node) => {
          minX = Math.min(minX, node.position.x)
          maxX = Math.max(maxX, node.position.x + node.size.width)
          minY = Math.min(minY, node.position.y)
          maxY = Math.max(maxY, node.position.y + node.size.height)
        })

        const contentCenterX = (minX + maxX) / 2
        const contentCenterY = (minY + maxY) / 2

        const panX = viewportWidth / 2 - contentCenterX * canvas.zoom
        const panY = viewportHeight / 2 - contentCenterY * canvas.zoom

        set((state) => ({
          canvas: { ...state.canvas, pan: { x: panX, y: panY } },
        }))
      },
    }),
    {
      name: 'flowchart-storage',
      partialize: (state) => ({
        nodes: state.nodes,
        connections: state.connections,
        canvas: state.canvas,
      }),
    }
  )
)
