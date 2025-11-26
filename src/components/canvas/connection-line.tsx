'use client'

import { useFlowchartStore } from '@/modules/flowchart/hooks/use-flowchart-store'
import { useMemo, useState, useCallback, useRef, useEffect } from 'react'
import { Connection, FlowNode, Position } from '@/interfaces/flowchart'
import { useTheme } from 'next-themes'

interface ConnectionLineProps {
  connection: Connection
  zoom: number
}

type Anchor = 'top' | 'right' | 'bottom' | 'left'

const ARROW_GAP = 4
const SEGMENT_OFFSET = 40

function getAnchorPosition(node: FlowNode, anchor: Anchor, isTarget: boolean = false) {
  const { position, size, type } = node
  const x = position.x
  const y = position.y
  const gap = isTarget ? ARROW_GAP : 0

  const centerX = x + size.width / 2
  const centerY = y + size.height / 2

  if (type === 'connector') {
    const radius = Math.min(size.width, size.height) / 2
    switch (anchor) {
      case 'top':
        return { x: centerX, y: centerY - radius - gap }
      case 'right':
        return { x: centerX + radius + gap, y: centerY }
      case 'bottom':
        return { x: centerX, y: centerY + radius + gap }
      case 'left':
        return { x: centerX - radius - gap, y: centerY }
    }
  }

  if (type === 'document' && anchor === 'bottom') {
    const waveHeight = 15
    return { x: centerX, y: y + size.height - waveHeight + gap }
  }

  switch (anchor) {
    case 'top':
      return { x: centerX, y: y - gap }
    case 'right':
      return { x: x + size.width + gap, y: centerY }
    case 'bottom':
      return { x: centerX, y: y + size.height + gap }
    case 'left':
      return { x: x - gap, y: centerY }
  }
}

function getInitialDirection(anchor: Anchor): { x: number; y: number } {
  switch (anchor) {
    case 'top': return { x: 0, y: -1 }
    case 'bottom': return { x: 0, y: 1 }
    case 'left': return { x: -1, y: 0 }
    case 'right': return { x: 1, y: 0 }
  }
}

function calculateOrthogonalPath(
  start: Position,
  end: Position,
  fromAnchor: Anchor,
  toAnchor: Anchor,
  waypoints?: Position[]
): Position[] {
  if (waypoints && waypoints.length > 0) {
    return [start, ...waypoints, end]
  }

  const startDir = getInitialDirection(fromAnchor)
  const endDir = getInitialDirection(toAnchor)

  const points: Position[] = [start]

  const isHorizontalStart = startDir.x !== 0
  const isHorizontalEnd = endDir.x !== 0

  if (isHorizontalStart && isHorizontalEnd) {
    const midX = (start.x + end.x) / 2
    points.push({ x: midX, y: start.y })
    points.push({ x: midX, y: end.y })
  } else if (!isHorizontalStart && !isHorizontalEnd) {
    const midY = (start.y + end.y) / 2
    points.push({ x: start.x, y: midY })
    points.push({ x: end.x, y: midY })
  } else if (isHorizontalStart) {
    points.push({ x: end.x, y: start.y })
  } else {
    points.push({ x: start.x, y: end.y })
  }

  points.push(end)
  return points
}

function generatePathD(points: Position[]): string {
  if (points.length < 2) return ''

  let d = `M ${points[0].x} ${points[0].y}`
  for (let i = 1; i < points.length; i++) {
    d += ` L ${points[i].x} ${points[i].y}`
  }
  return d
}

export function ConnectionLine({ connection, zoom }: ConnectionLineProps) {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'

  const {
    nodes,
    connections,
    selectedConnectionId,
    selectConnection,
    updateConnection,
    isConnecting,
    connectingFrom,
    addConnection,
    stopConnecting,
    startConnecting,
    saveToHistory,
  } = useFlowchartStore()

  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(connection.label || '')
  const [draggingSegment, setDraggingSegment] = useState<number | null>(null)
  const dragStartRef = useRef<{ x: number; y: number; waypoints: Position[] } | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const fromNode = nodes.find((n) => n.id === connection.from)
  const toNode = nodes.find((n) => n.id === connection.to)

  const isSelected = selectedConnectionId === connection.id

  useEffect(() => {
    setEditValue(connection.label || '')
  }, [connection.label])

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  const pathData = useMemo(() => {
    if (!fromNode || !toNode) return null

    const start = getAnchorPosition(fromNode, connection.fromAnchor, false)
    let end = getAnchorPosition(toNode, connection.toAnchor, true)

    if (!start || !end) return null

    // Detectar si esta es una conexión horizontal que llega a un anchor vertical
    const isFromHorizontal = connection.fromAnchor === 'left' || connection.fromAnchor === 'right'
    const isToVertical = connection.toAnchor === 'top' || connection.toAnchor === 'bottom'

    // Buscar si hay una conexión vertical que termina en el mismo nodo y anchor
    let verticalLineX: number | null = null
    if (isFromHorizontal && isToVertical) {
      // Buscar una conexión que sea REALMENTE vertical (sale de top/bottom Y llega a top/bottom)
      const verticalConnection = connections.find(conn =>
        conn.id !== connection.id &&
        conn.to === connection.to &&
        conn.toAnchor === connection.toAnchor &&
        (conn.fromAnchor === 'top' || conn.fromAnchor === 'bottom') &&
        (conn.toAnchor === 'top' || conn.toAnchor === 'bottom')
      )

      if (verticalConnection) {
        // La línea vertical pasa por el centro X del nodo destino
        verticalLineX = toNode.position.x + toNode.size.width / 2
      }
    }

    const points = calculateOrthogonalPath(
      start,
      end,
      connection.fromAnchor,
      connection.toAnchor,
      connection.waypoints
    )

    // Si encontramos una línea vertical, ajustar el último punto para conectar a la línea
    if (verticalLineX !== null && points.length >= 2) {
      // Buscar el segmento horizontal más cercano al final y ajustar su punto final
      for (let i = points.length - 1; i >= 1; i--) {
        const curr = points[i]
        const prev = points[i - 1]
        const isHorizontalSegment = Math.abs(curr.y - prev.y) < 1

        if (isHorizontalSegment) {
          // Ajustar el punto final de este segmento horizontal a la línea vertical
          points[i] = { x: verticalLineX, y: curr.y }
          // Eliminar todos los puntos después de este (si los hay)
          points.length = i + 1
          break
        }
      }
    }

    const d = generatePathD(points)

    // Asegurar que tenemos al menos 2 puntos para los cálculos
    if (points.length < 2) {
      return null
    }

    const lastTwo = points.slice(-2)
    const arrowAngle = Math.atan2(
      lastTwo[1].y - lastTwo[0].y,
      lastTwo[1].x - lastTwo[0].x
    )

    // Calcular el punto medio de forma segura
    const midIndex = Math.min(Math.floor(points.length / 2), points.length - 1)
    const prevIndex = Math.max(0, midIndex - 1)
    const mid = {
      x: (points[prevIndex].x + points[midIndex].x) / 2,
      y: (points[prevIndex].y + points[midIndex].y) / 2,
    }

    return { d, points, end: lastTwo[1], arrowAngle, mid }
  }, [fromNode, toNode, connection.fromAnchor, connection.toAnchor, connection.waypoints, connections, nodes, connection.id, connection.to])

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    saveToHistory()
    setIsEditing(true)
  }, [saveToHistory])

  const handleSaveLabel = useCallback(() => {
    updateConnection(connection.id, { label: editValue.trim() || undefined })
    setIsEditing(false)
  }, [connection.id, editValue, updateConnection])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveLabel()
    } else if (e.key === 'Escape') {
      setEditValue(connection.label || '')
      setIsEditing(false)
    }
  }, [handleSaveLabel, connection.label])

  const handleBlur = useCallback(() => {
    handleSaveLabel()
  }, [handleSaveLabel])

  const handleSegmentMouseDown = useCallback((e: React.MouseEvent, segmentIndex: number) => {
    if (e.button !== 0) return
    e.stopPropagation()
    e.preventDefault()

    saveToHistory()
    setDraggingSegment(segmentIndex)
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      waypoints: connection.waypoints ? [...connection.waypoints] : [],
    }
  }, [connection.waypoints, saveToHistory])

  useEffect(() => {
    if (draggingSegment === null) return

    const handleMouseMove = (e: MouseEvent) => {
      if (!dragStartRef.current || !pathData) return

      const dx = (e.clientX - dragStartRef.current.x) / zoom
      const dy = (e.clientY - dragStartRef.current.y) / zoom

      const points = pathData.points
      const segmentStart = points[draggingSegment]
      const segmentEnd = points[draggingSegment + 1]

      const isHorizontal = Math.abs(segmentEnd.y - segmentStart.y) < 1

      let newWaypoints: Position[] = []

      if (points.length === 4) {
        if (isHorizontal) {
          const newY = segmentStart.y + dy
          newWaypoints = [
            { x: points[1].x, y: newY },
            { x: points[2].x, y: newY },
          ]
        } else {
          const newX = segmentStart.x + dx
          newWaypoints = [
            { x: newX, y: points[1].y },
            { x: newX, y: points[2].y },
          ]
        }
      } else if (points.length === 3) {
        if (draggingSegment === 0) {
          if (isHorizontal) {
            newWaypoints = [{ x: points[1].x, y: segmentStart.y + dy }]
          } else {
            newWaypoints = [{ x: segmentStart.x + dx, y: points[1].y }]
          }
        } else {
          if (isHorizontal) {
            newWaypoints = [{ x: points[1].x, y: segmentEnd.y + dy }]
          } else {
            newWaypoints = [{ x: segmentEnd.x + dx, y: points[1].y }]
          }
        }
      }

      if (newWaypoints.length > 0) {
        updateConnection(connection.id, { waypoints: newWaypoints })
      }
    }

    const handleMouseUp = () => {
      setDraggingSegment(null)
      dragStartRef.current = null
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [draggingSegment, zoom, pathData, connection.id, updateConnection])

  const handleAnchorClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()

    if (isConnecting && connectingFrom) {
      if (connectingFrom.nodeId !== connection.to) {
        addConnection(
          connectingFrom.nodeId,
          connection.to,
          connectingFrom.anchor,
          connection.toAnchor
        )
      }
      stopConnecting()
    } else {
      startConnecting(connection.from, 'bottom')
    }
  }, [isConnecting, connectingFrom, connection, addConnection, stopConnecting, startConnecting])

  if (!pathData) return null

  const strokeColor = isSelected
    ? isDark
      ? '#818cf8'
      : '#6366f1'
    : isDark
      ? '#64748b'
      : '#94a3b8'

  const arrowSize = 10
  const arrowPoint1 = {
    x: pathData.end.x - arrowSize * Math.cos(pathData.arrowAngle - Math.PI / 6),
    y: pathData.end.y - arrowSize * Math.sin(pathData.arrowAngle - Math.PI / 6),
  }
  const arrowPoint2 = {
    x: pathData.end.x - arrowSize * Math.cos(pathData.arrowAngle + Math.PI / 6),
    y: pathData.end.y - arrowSize * Math.sin(pathData.arrowAngle + Math.PI / 6),
  }

  const labelText = connection.label || ''
  const labelWidth = labelText.length * 8 + 16
  const labelHeight = 18

  return (
    <g
      onClick={(e) => {
        e.stopPropagation()
        selectConnection(connection.id)
      }}
      onDoubleClick={handleDoubleClick}
      style={{ cursor: 'pointer' }}
    >
      <path d={pathData.d} fill="none" stroke="transparent" strokeWidth={20} />

      <path
        d={pathData.d}
        fill="none"
        stroke={strokeColor}
        strokeWidth={isSelected ? 3 : 2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Fondo para el label */}
      {labelText && (
        <rect
          x={pathData.mid.x - labelWidth / 2}
          y={pathData.mid.y - labelHeight / 2}
          width={labelWidth}
          height={labelHeight}
          fill={isDark ? '#0f172a' : '#f8fafc'}
          rx={4}
        />
      )}

      <polygon
        points={`${pathData.end.x},${pathData.end.y} ${arrowPoint1.x},${arrowPoint1.y} ${arrowPoint2.x},${arrowPoint2.y}`}
        fill={strokeColor}
      />

      {isSelected && pathData.points.length > 2 && (
        <>
          {pathData.points.slice(0, -1).map((point, i) => {
            const nextPoint = pathData.points[i + 1]
            const midX = (point.x + nextPoint.x) / 2
            const midY = (point.y + nextPoint.y) / 2
            const isHorizontal = Math.abs(nextPoint.y - point.y) < 1

            if (i === 0 || i === pathData.points.length - 2) {
              return null
            }

            return (
              <g key={i}>
                <line
                  x1={point.x}
                  y1={point.y}
                  x2={nextPoint.x}
                  y2={nextPoint.y}
                  stroke="transparent"
                  strokeWidth={12}
                  style={{ cursor: isHorizontal ? 'ns-resize' : 'ew-resize' }}
                  onMouseDown={(e) => handleSegmentMouseDown(e, i)}
                />
                <rect
                  x={midX - 6}
                  y={midY - 6}
                  width={12}
                  height={12}
                  rx={2}
                  fill={isDark ? '#1e293b' : '#ffffff'}
                  stroke={isDark ? '#818cf8' : '#6366f1'}
                  strokeWidth={2}
                  style={{ cursor: isHorizontal ? 'ns-resize' : 'ew-resize' }}
                  onMouseDown={(e) => handleSegmentMouseDown(e, i)}
                />
              </g>
            )
          })}
        </>
      )}

      {isEditing ? (
        <foreignObject
          x={pathData.mid.x - 60}
          y={pathData.mid.y - 14}
          width={120}
          height={28}
        >
          <input
            ref={inputRef}
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            className="w-full h-full px-2 text-center text-sm border-2 rounded outline-none"
            style={{
              backgroundColor: isDark ? '#1e293b' : '#ffffff',
              borderColor: isDark ? '#818cf8' : '#6366f1',
              color: isDark ? '#e2e8f0' : '#1e293b',
            }}
            placeholder="Etiqueta..."
          />
        </foreignObject>
      ) : labelText ? (
        <text
          x={pathData.mid.x}
          y={pathData.mid.y + 4}
          textAnchor="middle"
          fill={isDark ? '#e2e8f0' : '#1e293b'}
          fontSize={12}
          fontWeight={500}
          style={{ pointerEvents: 'none' }}
        >
          {labelText}
        </text>
      ) : isSelected ? (
        <text
          x={pathData.mid.x}
          y={pathData.mid.y + 4}
          textAnchor="middle"
          fill={isDark ? '#64748b' : '#94a3b8'}
          fontSize={10}
          fontStyle="italic"
          style={{ pointerEvents: 'none' }}
        >
          Doble clic para editar
        </text>
      ) : null}
    </g>
  )
}
