'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  TraceTableData,
  TraceTableColumn,
  WebLLMModel,
  WebLLMProgress,
  FlowNode,
  Connection,
} from '@/interfaces/flowchart'

export const AVAILABLE_MODELS: WebLLMModel[] = [
  {
    id: 'Llama-3.2-1B-Instruct-q4f32_1-MLC',
    name: 'Llama 3.2 1B',
    size: '~700MB',
    description: 'Modelo pequeño y rápido, ideal para tareas simples',
  },
  {
    id: 'Llama-3.2-3B-Instruct-q4f32_1-MLC',
    name: 'Llama 3.2 3B',
    size: '~1.8GB',
    description: 'Buen balance entre velocidad y calidad',
  },
  {
    id: 'Phi-3.5-mini-instruct-q4f16_1-MLC',
    name: 'Phi 3.5 Mini',
    size: '~2.3GB',
    description: 'Modelo de Microsoft, bueno para razonamiento',
  },
  {
    id: 'gemma-2-2b-it-q4f32_1-MLC',
    name: 'Gemma 2 2B',
    size: '~1.4GB',
    description: 'Modelo de Google, eficiente y preciso',
  },
  {
    id: 'Qwen2.5-1.5B-Instruct-q4f32_1-MLC',
    name: 'Qwen 2.5 1.5B',
    size: '~900MB',
    description: 'Modelo chino, muy eficiente',
  },
]

interface WebLLMStore {
  isModelLoaded: boolean
  isLoading: boolean
  selectedModelId: string
  loadProgress: WebLLMProgress | null
  engine: unknown | null

  traceTableData: TraceTableData | null
  isGenerating: boolean
  testCount: number

  setSelectedModel: (modelId: string) => void
  setLoadProgress: (progress: WebLLMProgress | null) => void
  setEngine: (engine: unknown) => void
  setIsLoading: (isLoading: boolean) => void
  setIsModelLoaded: (isLoaded: boolean) => void

  setTraceTableData: (data: TraceTableData | null) => void
  updateColumnLabel: (nodeId: string, newLabel: string) => void
  setIsGenerating: (isGenerating: boolean) => void
  setTestCount: (count: number) => void

  generateTraceTable: (nodes: FlowNode[], connections: Connection[]) => TraceTableColumn[]
  clearTraceTable: () => void
}

export const useWebLLMStore = create<WebLLMStore>()(
  persist(
    (set, get) => ({
      isModelLoaded: false,
      isLoading: false,
      selectedModelId: AVAILABLE_MODELS[0].id,
      loadProgress: null,
      engine: null,

      traceTableData: null,
      isGenerating: false,
      testCount: 10,

      setSelectedModel: (modelId) => set({ selectedModelId: modelId }),
      setLoadProgress: (progress) => set({ loadProgress: progress }),
      setEngine: (engine) => set({ engine, isModelLoaded: !!engine }),
      setIsLoading: (isLoading) => set({ isLoading }),
      setIsModelLoaded: (isLoaded) => set({ isModelLoaded: isLoaded }),

      setTraceTableData: (data) => set({ traceTableData: data }),

      updateColumnLabel: (nodeId, newLabel) => {
        const { traceTableData } = get()
        if (!traceTableData) return

        set({
          traceTableData: {
            ...traceTableData,
            columns: traceTableData.columns.map((col) =>
              col.nodeId === nodeId ? { ...col, label: newLabel } : col
            ),
          },
        })
      },

      setIsGenerating: (isGenerating) => set({ isGenerating }),
      setTestCount: (count) => set({ testCount: Math.min(Math.max(1, count), 100) }),

      generateTraceTable: (nodes, connections) => {
        const processNodes = nodes.filter((node) => node.type !== 'start-end')

        const startNode = nodes.find((n) => n.type === 'start-end')
        const orderedNodes: FlowNode[] = []
        const visited = new Set<string>()

        if (startNode) {
          const queue = [startNode.id]
          while (queue.length > 0) {
            const currentId = queue.shift()!
            if (visited.has(currentId)) continue
            visited.add(currentId)

            const currentNode = nodes.find((n) => n.id === currentId)
            if (currentNode && currentNode.type !== 'start-end') {
              orderedNodes.push(currentNode)
            }

            const outgoing = connections.filter((c) => c.from === currentId)
            outgoing.forEach((conn) => {
              if (!visited.has(conn.to)) {
                queue.push(conn.to)
              }
            })
          }
        }

        const finalNodes = orderedNodes.length > 0 ? orderedNodes : processNodes

        const columns: TraceTableColumn[] = finalNodes.map((node) => ({
          nodeId: node.id,
          label: node.label || `Proceso ${node.id.slice(0, 4)}`,
          originalLabel: node.label || `Proceso ${node.id.slice(0, 4)}`,
        }))

        return columns
      },

      clearTraceTable: () => set({ traceTableData: null }),
    }),
    {
      name: 'webllm-storage',
      partialize: (state) => ({
        selectedModelId: state.selectedModelId,
        testCount: state.testCount,
      }),
    }
  )
)
