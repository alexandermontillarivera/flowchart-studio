export type ShapeType =
  | 'start-end'
  | 'process'
  | 'decision'
  | 'data'
  | 'document'
  | 'predefined-process'
  | 'connector'
  | 'delay'
  | 'manual-input'
  | 'preparation'
  | 'database'
  | 'display'
  | 'manual-operation'
  | 'loop-limit'
  | 'merge'
  | 'or'
  | 'summing-junction'
  | 'collate'
  | 'sort'
  | 'stored-data'
  | 'internal-storage'

export interface Position {
  x: number
  y: number
}

export interface Size {
  width: number
  height: number
}

export interface FlowNode {
  id: string
  type: ShapeType
  position: Position
  size: Size
  label: string
  color?: string
  connections: string[]
}

export interface Connection {
  id: string
  from: string
  to: string
  fromAnchor: 'top' | 'right' | 'bottom' | 'left'
  toAnchor: 'top' | 'right' | 'bottom' | 'left'
  label?: string
  controlPointOffset?: Position
}

export interface CanvasState {
  zoom: number
  pan: Position
}

export interface FlowchartState {
  nodes: FlowNode[]
  connections: Connection[]
  selectedNodeId: string | null
  selectedConnectionId: string | null
  canvas: CanvasState
}

export interface ShapeDefinition {
  type: ShapeType
  name: string
  description: string
  defaultSize: Size
  icon: React.ComponentType<{ className?: string }>
}

export interface TraceTableColumn {
  nodeId: string
  label: string
  originalLabel: string
}

export interface TraceTableRow {
  id: string
  values: Record<string, string>
  iteration?: number
}

export interface TraceTableData {
  columns: TraceTableColumn[]
  rows: TraceTableRow[]
  flowAnalysis: string
  generatedAt: Date
}

export interface WebLLMModel {
  id: string
  name: string
  size: string
  description: string
}

export interface WebLLMProgress {
  text: string
  progress: number
}
