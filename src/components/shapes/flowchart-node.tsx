'use client'

import { useRef, useState, useCallback, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useTheme } from 'next-themes'
import { ShapeRenderer } from './shape-renderer'
import { useFlowchartStore } from '@/modules/flowchart/hooks/use-flowchart-store'
import { FlowNode } from '@/interfaces/flowchart'

interface FlowchartNodeProps {
  node: FlowNode
  zoom: number
  isViewMode?: boolean
}

type Anchor = 'top' | 'right' | 'bottom' | 'left'
type ResizeHandle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w'

const MIN_SIZE = { width: 60, height: 40 }

export function FlowchartNode({ node, zoom, isViewMode = false }: FlowchartNodeProps) {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'

  const {
    selectedNodeId,
    selectNode,
    updateNode,
    setDragging,
    isConnecting,
    connectingFrom,
    startConnecting,
    stopConnecting,
    addConnection,
  } = useFlowchartStore()

  const isSelected = selectedNodeId === node.id
  const nodeRef = useRef<HTMLDivElement>(null)
  const [isDraggingNode, setIsDraggingNode] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const [resizeHandle, setResizeHandle] = useState<ResizeHandle | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(node.label)
  const dragStart = useRef({ x: 0, y: 0, nodeX: 0, nodeY: 0 })
  const resizeStart = useRef({ x: 0, y: 0, width: 0, height: 0, nodeX: 0, nodeY: 0 })

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (isViewMode) return
      if (e.button !== 0) return
      if ((e.target as HTMLElement).closest('.anchor-point')) return
      if ((e.target as HTMLElement).closest('.resize-handle')) return

      e.stopPropagation()
      selectNode(node.id)
      setIsDraggingNode(true)
      setDragging(true)

      dragStart.current = {
        x: e.clientX,
        y: e.clientY,
        nodeX: node.position.x,
        nodeY: node.position.y,
      }
    },
    [node.id, node.position, selectNode, setDragging, isViewMode]
  )

  const handleResizeMouseDown = useCallback(
    (e: React.MouseEvent, handle: ResizeHandle) => {
      if (isViewMode) return
      e.stopPropagation()
      e.preventDefault()
      setIsResizing(true)
      setResizeHandle(handle)
      setDragging(true)

      resizeStart.current = {
        x: e.clientX,
        y: e.clientY,
        width: node.size.width,
        height: node.size.height,
        nodeX: node.position.x,
        nodeY: node.position.y,
      }
    },
    [node.size, node.position, setDragging, isViewMode]
  )

  const handleResizeMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isResizing || !resizeHandle) return

      const dx = (e.clientX - resizeStart.current.x) / zoom
      const dy = (e.clientY - resizeStart.current.y) / zoom

      let newWidth = resizeStart.current.width
      let newHeight = resizeStart.current.height
      let newX = resizeStart.current.nodeX
      let newY = resizeStart.current.nodeY

      if (resizeHandle.includes('e')) {
        newWidth = Math.max(MIN_SIZE.width, resizeStart.current.width + dx)
      }
      if (resizeHandle.includes('w')) {
        const widthChange = Math.min(dx, resizeStart.current.width - MIN_SIZE.width)
        newWidth = resizeStart.current.width - widthChange
        newX = resizeStart.current.nodeX + widthChange
      }
      if (resizeHandle.includes('s')) {
        newHeight = Math.max(MIN_SIZE.height, resizeStart.current.height + dy)
      }
      if (resizeHandle.includes('n')) {
        const heightChange = Math.min(dy, resizeStart.current.height - MIN_SIZE.height)
        newHeight = resizeStart.current.height - heightChange
        newY = resizeStart.current.nodeY + heightChange
      }

      updateNode(node.id, {
        size: { width: newWidth, height: newHeight },
        position: { x: newX, y: newY },
      })
    },
    [isResizing, resizeHandle, node.id, updateNode, zoom]
  )

  const handleResizeMouseUp = useCallback(() => {
    if (isResizing) {
      setIsResizing(false)
      setResizeHandle(null)
      setDragging(false)
    }
  }, [isResizing, setDragging])

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDraggingNode) return

      const dx = (e.clientX - dragStart.current.x) / zoom
      const dy = (e.clientY - dragStart.current.y) / zoom

      updateNode(node.id, {
        position: {
          x: dragStart.current.nodeX + dx,
          y: dragStart.current.nodeY + dy,
        },
      })
    },
    [isDraggingNode, node.id, updateNode, zoom]
  )

  const handleMouseUp = useCallback(() => {
    if (isDraggingNode) {
      setIsDraggingNode(false)
      setDragging(false)
    }
  }, [isDraggingNode, setDragging])

  useEffect(() => {
    if (isDraggingNode) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
      return () => {
        window.removeEventListener('mousemove', handleMouseMove)
        window.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isDraggingNode, handleMouseMove, handleMouseUp])

  useEffect(() => {
    if (isResizing) {
      window.addEventListener('mousemove', handleResizeMouseMove)
      window.addEventListener('mouseup', handleResizeMouseUp)
      return () => {
        window.removeEventListener('mousemove', handleResizeMouseMove)
        window.removeEventListener('mouseup', handleResizeMouseUp)
      }
    }
  }, [isResizing, handleResizeMouseMove, handleResizeMouseUp])

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    setIsEditing(true)
    setEditValue(node.label)
  }, [node.label])

  const handleBlur = useCallback(() => {
    setIsEditing(false)
    updateNode(node.id, { label: editValue })
  }, [editValue, node.id, updateNode])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleBlur()
      }
      if (e.key === 'Escape') {
        setIsEditing(false)
        setEditValue(node.label)
      }
    },
    [handleBlur, node.label]
  )

  const handleAnchorMouseDown = useCallback(
    (e: React.MouseEvent, anchor: Anchor) => {
      if (isViewMode) return
      e.stopPropagation()
      e.preventDefault()

      if (isConnecting && connectingFrom) {
        addConnection(connectingFrom.nodeId, node.id, connectingFrom.anchor, anchor)
        stopConnecting()
      } else {
        startConnecting(node.id, anchor)
      }
    },
    [isConnecting, connectingFrom, node.id, startConnecting, stopConnecting, addConnection, isViewMode]
  )

  const resizeHandles: { handle: ResizeHandle; style: React.CSSProperties; cursor: string }[] = [
    { handle: 'nw', style: { top: -4, left: -4 }, cursor: 'nwse-resize' },
    { handle: 'n', style: { top: -4, left: '50%', transform: 'translateX(-50%)' }, cursor: 'ns-resize' },
    { handle: 'ne', style: { top: -4, right: -4 }, cursor: 'nesw-resize' },
    { handle: 'e', style: { top: '50%', right: -4, transform: 'translateY(-50%)' }, cursor: 'ew-resize' },
    { handle: 'se', style: { bottom: -4, right: -4 }, cursor: 'nwse-resize' },
    { handle: 's', style: { bottom: -4, left: '50%', transform: 'translateX(-50%)' }, cursor: 'ns-resize' },
    { handle: 'sw', style: { bottom: -4, left: -4 }, cursor: 'nesw-resize' },
    { handle: 'w', style: { top: '50%', left: -4, transform: 'translateY(-50%)' }, cursor: 'ew-resize' },
  ]

  const anchorPositions: Record<Anchor, { top: string; left: string; transform: string }> = {
    top: { top: '0', left: '50%', transform: 'translate(-50%, -50%)' },
    right: { top: '50%', left: '100%', transform: 'translate(-50%, -50%)' },
    bottom: { top: '100%', left: '50%', transform: 'translate(-50%, -50%)' },
    left: { top: '50%', left: '0', transform: 'translate(-50%, -50%)' },
  }

  const isConnectingFromThis = connectingFrom?.nodeId === node.id

  return (
    <motion.div
      ref={nodeRef}
      className="absolute select-none"
      style={{
        left: node.position.x,
        top: node.position.y,
        width: node.size.width,
        height: node.size.height,
        cursor: isDraggingNode ? 'grabbing' : 'grab',
        zIndex: isSelected ? 10 : 1,
      }}
      onMouseDown={handleMouseDown}
      onDoubleClick={handleDoubleClick}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
    >
      <ShapeRenderer
        type={node.type}
        width={node.size.width}
        height={node.size.height}
        selected={isSelected}
        color={node.color}
      />

      <div
        className="absolute inset-0 flex items-center justify-center p-2"
        style={{ pointerEvents: isEditing ? 'auto' : 'none' }}
      >
        {isEditing ? (
          <textarea
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            autoFocus
            className={`w-full h-full resize-none text-center text-sm font-medium bg-transparent border-none outline-none ${isDark ? 'text-slate-100' : 'text-slate-800'
              }`}
            style={{
              lineHeight: '1.4',
            }}
          />
        ) : (
          <span
            className={`text-center text-sm font-medium break-words overflow-hidden ${isDark ? 'text-slate-100' : 'text-slate-800'
              }`}
            style={{
              maxWidth: node.size.width - 16,
              maxHeight: node.size.height - 16,
              lineHeight: '1.4',
            }}
          >
            {node.label}
          </span>
        )}
      </div>

      {isSelected && !isViewMode && !isConnecting && (
        <>
          {resizeHandles.map(({ handle, style, cursor }) => (
            <div
              key={handle}
              className={`resize-handle absolute w-2 h-2 rounded-sm border transition-colors ${isDark
                  ? 'bg-slate-700 border-indigo-400 hover:bg-indigo-500'
                  : 'bg-white border-indigo-500 hover:bg-indigo-400'
                }`}
              style={{ ...style, cursor, position: 'absolute' }}
              onMouseDown={(e) => handleResizeMouseDown(e, handle)}
            />
          ))}
        </>
      )}

      {(isSelected || isConnecting) && !isViewMode && (
        <>
          {(['top', 'right', 'bottom', 'left'] as Anchor[]).map((anchor) => (
            <div
              key={anchor}
              className={`anchor-point absolute w-3 h-3 rounded-full border-2 transition-all duration-150 cursor-crosshair ${isConnectingFromThis && connectingFrom?.anchor === anchor
                  ? isDark
                    ? 'bg-indigo-400 border-indigo-300 scale-125'
                    : 'bg-indigo-500 border-indigo-400 scale-125'
                  : isDark
                    ? 'bg-slate-700 border-slate-500 hover:bg-indigo-400 hover:border-indigo-300 hover:scale-125'
                    : 'bg-white border-slate-400 hover:bg-indigo-500 hover:border-indigo-400 hover:scale-125'
                }`}
              style={anchorPositions[anchor]}
              onMouseDown={(e) => handleAnchorMouseDown(e, anchor)}
            />
          ))}
        </>
      )}
    </motion.div>
  )
}
