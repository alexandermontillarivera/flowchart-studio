'use client'

import { useFlowchartStore } from '@/modules/flowchart/hooks/use-flowchart-store'
import { useMemo, useState, useCallback, useRef, useEffect } from 'react'
import { Connection, FlowNode } from '@/interfaces/flowchart'
import { useTheme } from 'next-themes'

interface ConnectionLineProps {
  connection: Connection
  zoom: number
}

interface Point {
  x: number
  y: number
}

type Anchor = 'top' | 'right' | 'bottom' | 'left'

const ARROW_GAP = 4

function getAnchorPosition(node: FlowNode, anchor: Anchor, isTarget: boolean = false) {
  const { position, size } = node
  const x = position.x
  const y = position.y
  const gap = isTarget ? ARROW_GAP : 0

  switch (anchor) {
    case 'top':
      return { x: x + size.width / 2, y: y - gap }
    case 'right':
      return { x: x + size.width + gap, y: y + size.height / 2 }
    case 'bottom':
      return { x: x + size.width / 2, y: y + size.height + gap }
    case 'left':
      return { x: x - gap, y: y + size.height / 2 }
  }
}

function getControlPoints(
  start: { x: number; y: number },
  end: { x: number; y: number },
  fromAnchor: Anchor,
  toAnchor: Anchor
) {
  const dx = end.x - start.x
  const dy = end.y - start.y
  const distance = Math.sqrt(dx * dx + dy * dy)

  const baseOffset = Math.min(distance * 0.3, 50)

  const getAnchorOffset = (anchor: Anchor, isStart: boolean) => {
    switch (anchor) {
      case 'top':
        return { x: 0, y: isStart ? -baseOffset : -baseOffset }
      case 'right':
        return { x: isStart ? baseOffset : baseOffset, y: 0 }
      case 'bottom':
        return { x: 0, y: isStart ? baseOffset : baseOffset }
      case 'left':
        return { x: isStart ? -baseOffset : -baseOffset, y: 0 }
    }
  }

  const startOffset = getAnchorOffset(fromAnchor, true)
  const endOffset = getAnchorOffset(toAnchor, false)

  const midX = (start.x + end.x) / 2
  const midY = (start.y + end.y) / 2

  return {
    cp1: { x: start.x + startOffset.x, y: start.y + startOffset.y },
    cp2: { x: end.x + endOffset.x, y: end.y + endOffset.y },
    mid: { x: midX, y: midY },
  }
}

function getArrowDirection(anchor: Anchor): Point {
  switch (anchor) {
    case 'top':
      return { x: 0, y: 1 }
    case 'bottom':
      return { x: 0, y: -1 }
    case 'left':
      return { x: 1, y: 0 }
    case 'right':
      return { x: -1, y: 0 }
  }
}



export function ConnectionLine({ connection }: ConnectionLineProps) {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'

  const {
    nodes,
    selectedConnectionId,
    selectConnection,
    updateConnection,
    isConnecting,
    connectingFrom,
    addConnection,
    stopConnecting,
    startConnecting,
  } = useFlowchartStore()

  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(connection.label || '')
  const [isHoveringAnchor, setIsHoveringAnchor] = useState(false)
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
    const end = getAnchorPosition(toNode, connection.toAnchor, true)

    const { cp1, cp2, mid } = getControlPoints(
      start,
      end,
      connection.fromAnchor,
      connection.toAnchor
    )

    return {
      d: `M ${start.x} ${start.y} C ${cp1.x} ${cp1.y}, ${cp2.x} ${cp2.y}, ${end.x} ${end.y}`,
      start,
      end,
      cp1,
      cp2,
      mid,
    }
  }, [fromNode, toNode, connection.fromAnchor, connection.toAnchor])

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    setIsEditing(true)
  }, [])

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

  const bgColor = isDark ? '#0f172a' : '#f8fafc'

  const direction = getArrowDirection(connection.toAnchor)
  const angle = Math.atan2(direction.y, direction.x)
  const arrowSize = 12

  const arrowPoint1 = {
    x: pathData.end.x - arrowSize * Math.cos(angle - Math.PI / 6),
    y: pathData.end.y - arrowSize * Math.sin(angle - Math.PI / 6),
  }
  const arrowPoint2 = {
    x: pathData.end.x - arrowSize * Math.cos(angle + Math.PI / 6),
    y: pathData.end.y - arrowSize * Math.sin(angle + Math.PI / 6),
  }

  const labelText = connection.label || ''
  const labelWidth = labelText.length * 8 + 16
  const labelHeight = 18

  const clipId = `clip-${connection.id}`
  const maskId = `mask-${connection.id}`

  return (
    <g
      onClick={(e) => {
        e.stopPropagation()
        selectConnection(connection.id)
      }}
      onDoubleClick={handleDoubleClick}
      style={{ cursor: 'pointer' }}
    >
      {labelText && (
        <defs>
          <mask id={maskId}>
            <rect x="-10000" y="-10000" width="20000" height="20000" fill="white" />
            <rect
              x={pathData.mid.x - labelWidth / 2}
              y={pathData.mid.y - labelHeight / 2}
              width={labelWidth}
              height={labelHeight}
              fill="black"
            />
          </mask>
        </defs>
      )}

      <path d={pathData.d} fill="none" stroke="transparent" strokeWidth={20} />

      <path
        d={pathData.d}
        fill="none"
        stroke={strokeColor}
        strokeWidth={isSelected ? 3 : 2}
        strokeLinecap="round"
        mask={labelText ? `url(#${maskId})` : undefined}
      />

      <polygon
        points={`${pathData.end.x},${pathData.end.y} ${arrowPoint1.x},${arrowPoint1.y} ${arrowPoint2.x},${arrowPoint2.y}`}
        fill={strokeColor}
      />

      <g
        onMouseEnter={() => setIsHoveringAnchor(true)}
        onMouseLeave={() => setIsHoveringAnchor(false)}
        onClick={handleAnchorClick}
        style={{ cursor: isConnecting ? 'crosshair' : 'pointer' }}
      >
        <circle
          cx={pathData.mid.x}
          cy={pathData.mid.y}
          r={isHoveringAnchor || isConnecting ? 8 : 5}
          fill={isHoveringAnchor || isConnecting ? (isDark ? '#818cf8' : '#6366f1') : 'transparent'}
          stroke={isHoveringAnchor || isSelected ? (isDark ? '#818cf8' : '#6366f1') : 'transparent'}
          strokeWidth={2}
          style={{
            transition: 'all 0.15s ease',
            opacity: isHoveringAnchor || isConnecting || isSelected ? 1 : 0,
          }}
        />
        {(isHoveringAnchor || isConnecting) && (
          <circle
            cx={pathData.mid.x}
            cy={pathData.mid.y}
            r={3}
            fill="white"
            pointerEvents="none"
          />
        )}
      </g>

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
