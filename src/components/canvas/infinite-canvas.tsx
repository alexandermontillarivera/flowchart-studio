'use client'

import { useRef, useState, useCallback, useEffect } from 'react'
import { useTheme } from 'next-themes'
import { FlowchartNode } from '@/components/shapes/flowchart-node'
import { ConnectionLine } from './connection-line'
import { useFlowchartStore } from '@/modules/flowchart/hooks/use-flowchart-store'
import { ShapeType } from '@/interfaces/flowchart'

interface InfiniteCanvasProps {
  onDrop?: (type: ShapeType, x: number, y: number) => void
  canvasRef?: React.RefObject<HTMLDivElement | null>
}

export function InfiniteCanvas({ onDrop, canvasRef: externalCanvasRef }: InfiniteCanvasProps) {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'

  const internalCanvasRef = useRef<HTMLDivElement>(null)
  const canvasRef = externalCanvasRef || internalCanvasRef
  const [isPanning, setIsPanning] = useState(false)
  const [isSpacePressed, setIsSpacePressed] = useState(false)
  const panStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 })

  const {
    nodes,
    connections,
    canvas,
    setZoom,
    setPan,
    clearSelection,
    isDragging,
    isConnecting,
    stopConnecting,
    isViewMode,
  } = useFlowchartStore()

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault()

      if (e.shiftKey) {
        setPan({
          x: canvas.pan.x - e.deltaY,
          y: canvas.pan.y,
        })
      } else {
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
        const mouseX = e.clientX - rect.left
        const mouseY = e.clientY - rect.top

        const pointXBeforeZoom = (mouseX - canvas.pan.x) / canvas.zoom
        const pointYBeforeZoom = (mouseY - canvas.pan.y) / canvas.zoom

        const delta = e.deltaY > 0 ? 0.9 : 1.1
        const newZoom = Math.max(0.1, Math.min(3, canvas.zoom * delta))

        const newPanX = mouseX - pointXBeforeZoom * newZoom
        const newPanY = mouseY - pointYBeforeZoom * newZoom

        setZoom(newZoom)
        setPan({ x: newPanX, y: newPanY })
      }
    },
    [canvas.zoom, canvas.pan, setZoom, setPan]
  )

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      const target = e.target as HTMLElement
      const isCanvasBackground = target === canvasRef.current ||
        target.tagName === 'svg' ||
        target.closest('#flowchart-canvas') === canvasRef.current &&
        !target.closest('.flowchart-node') &&
        !target.closest('g.pointer-events-auto')

      if (e.button === 1 || (e.button === 0 && e.altKey) || (e.button === 0 && isSpacePressed)) {
        e.preventDefault()
        setIsPanning(true)
        panStart.current = {
          x: e.clientX,
          y: e.clientY,
          panX: canvas.pan.x,
          panY: canvas.pan.y,
        }
      } else if (e.button === 0 && isCanvasBackground) {
        e.preventDefault()
        setIsPanning(true)
        panStart.current = {
          x: e.clientX,
          y: e.clientY,
          panX: canvas.pan.x,
          panY: canvas.pan.y,
        }
        clearSelection()
        if (isConnecting) {
          stopConnecting()
        }
      }
    },
    [canvas.pan, clearSelection, isConnecting, stopConnecting, canvasRef, isSpacePressed]
  )

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (isPanning) {
        const dx = e.clientX - panStart.current.x
        const dy = e.clientY - panStart.current.y
        setPan({
          x: panStart.current.panX + dx,
          y: panStart.current.panY + dy,
        })
      }
    },
    [isPanning, setPan]
  )

  const handleMouseUp = useCallback(() => {
    if (isPanning) {
      setIsPanning(false)
    }
  }, [isPanning])

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [handleMouseMove, handleMouseUp])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      const type = e.dataTransfer.getData('shape-type') as ShapeType
      if (!type || !canvasRef.current) return

      const rect = canvasRef.current.getBoundingClientRect()
      const x = (e.clientX - rect.left - canvas.pan.x) / canvas.zoom - 80
      const y = (e.clientY - rect.top - canvas.pan.y) / canvas.zoom - 40

      onDrop?.(type, x, y)
    },
    [canvas.pan, canvas.zoom, onDrop, canvasRef]
  )

  useEffect(() => {
    const preventBrowserZoom = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault()
      }
    }

    window.addEventListener('wheel', preventBrowserZoom, { passive: false })
    return () => {
      window.removeEventListener('wheel', preventBrowserZoom)
    }
  }, [])

  useEffect(() => {
    const preventKeyboardZoom = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === '+' || e.key === '-' || e.key === '=' || e.key === '0')) {
        e.preventDefault()
      }
    }

    window.addEventListener('keydown', preventKeyboardZoom)
    return () => {
      window.removeEventListener('keydown', preventKeyboardZoom)
    }
  }, [])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeElement = document.activeElement
      const isInputFocused = activeElement?.tagName === 'INPUT' || activeElement?.tagName === 'TEXTAREA'

      if (e.code === 'Space' && !e.repeat) {
        if (isInputFocused) return
        e.preventDefault()
        setIsSpacePressed(true)
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (isInputFocused) return
        useFlowchartStore.getState().deleteSelected()
      }
      if (e.key === 'Escape') {
        clearSelection()
        stopConnecting()
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        if (isInputFocused) return
        e.preventDefault()
        useFlowchartStore.getState().undo()
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        if (isInputFocused) return
        e.preventDefault()
        useFlowchartStore.getState().redo()
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
        if (isInputFocused) return
        e.preventDefault()
        useFlowchartStore.getState().copySelectedNode()
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
        if (isInputFocused) return
        e.preventDefault()
        useFlowchartStore.getState().pasteNode()
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsSpacePressed(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [clearSelection, stopConnecting])

  const gridSize = 20
  const gridColor = isDark ? 'rgba(148, 163, 184, 0.1)' : 'rgba(148, 163, 184, 0.3)'
  const dotSize = 1.5

  const getCursor = () => {
    if (isPanning) return 'grabbing'
    if (isSpacePressed) return 'grab'
    if (isDragging) return 'grabbing'
    return 'grab'
  }

  return (
    <div
      ref={canvasRef}
      id="flowchart-canvas"
      className="relative w-full h-full overflow-hidden"
      style={{
        backgroundColor: isDark ? '#0f172a' : '#f8fafc',
        cursor: getCursor(),
      }}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(circle, ${gridColor} ${dotSize}px, transparent ${dotSize}px)`,
          backgroundSize: `${gridSize * canvas.zoom}px ${gridSize * canvas.zoom}px`,
          backgroundPosition: `${canvas.pan.x % (gridSize * canvas.zoom)}px ${canvas.pan.y % (gridSize * canvas.zoom)}px`,
        }}
      />

      <div
        className="absolute origin-top-left"
        id="flowchart-content"
        style={{
          transform: `translate(${canvas.pan.x}px, ${canvas.pan.y}px) scale(${canvas.zoom})`,
          willChange: 'transform',
        }}
      >
        <svg
          className="absolute overflow-visible pointer-events-none"
          style={{ width: 1, height: 1, top: 0, left: 0 }}
        >
          <g className="pointer-events-auto">
            {connections.map((connection) => (
              <ConnectionLine key={connection.id} connection={connection} zoom={canvas.zoom} />
            ))}
          </g>
        </svg>

        {nodes.map((node) => (
          <FlowchartNode key={node.id} node={node} zoom={canvas.zoom} isViewMode={isViewMode} />
        ))}
      </div>

      {isConnecting && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-lg bg-indigo-500 text-white text-sm font-medium shadow-lg animate-pulse">
          Haz clic en otro punto de anclaje para conectar
        </div>
      )}
    </div>
  )
}
