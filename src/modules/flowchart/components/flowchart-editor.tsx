'use client'

import { useCallback, useRef } from 'react'
import { Box } from '@mui/material'
import { jsPDF } from 'jspdf'
import { ShapesSidebar } from '@/components/layout/shapes-sidebar'
import { InfiniteCanvas } from '@/components/canvas/infinite-canvas'
import { CanvasToolbar } from '@/components/toolbar/canvas-toolbar'
import { PropertiesPanel } from '@/components/elements/properties-panel'
import { KeyboardShortcuts } from '@/components/elements/keyboard-shortcuts'
import { useFlowchartStore } from '../hooks/use-flowchart-store'
import { useWebLLMStore } from '../hooks/use-webllm-store'
import { ShapeType } from '@/interfaces/flowchart'
import { toast } from 'sonner'

export function FlowchartEditor() {
  const { addNode, nodes, clearSelection } = useFlowchartStore()
  const { traceTableData } = useWebLLMStore()
  const canvasRef = useRef<HTMLDivElement>(null)

  const handleDrop = useCallback(
    (type: ShapeType, x: number, y: number) => {
      addNode(type, { x, y })
    },
    [addNode]
  )

  const handleExportPDF = useCallback(async () => {
    if (nodes.length === 0) {
      toast.info('No hay elementos para exportar')
      return
    }

    clearSelection()

    await new Promise((resolve) => setTimeout(resolve, 200))

    try {
      let minX = Infinity,
        maxX = -Infinity,
        minY = Infinity,
        maxY = -Infinity

      nodes.forEach((node) => {
        minX = Math.min(minX, node.position.x)
        maxX = Math.max(maxX, node.position.x + node.size.width)
        minY = Math.min(minY, node.position.y)
        maxY = Math.max(maxY, node.position.y + node.size.height)
      })

      const padding = 60
      const contentWidth = maxX - minX + padding * 2
      const contentHeight = maxY - minY + padding * 2

      const tempCanvas = document.createElement('canvas')
      const scale = 2
      tempCanvas.width = contentWidth * scale
      tempCanvas.height = contentHeight * scale
      const ctx = tempCanvas.getContext('2d')

      if (!ctx) {
        throw new Error('No se pudo obtener el contexto del canvas')
      }

      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height)
      ctx.scale(scale, scale)

      nodes.forEach((node) => {
        const x = node.position.x - minX + padding
        const y = node.position.y - minY + padding
        const w = node.size.width
        const h = node.size.height

        ctx.strokeStyle = '#6366f1'
        ctx.lineWidth = 2
        ctx.fillStyle = '#f8fafc'

        const drawShape = () => {
          ctx.beginPath()
          switch (node.type) {
            case 'start-end':
              ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2)
              ctx.fill()
              ctx.stroke()
              break

            case 'decision':
              ctx.moveTo(x + w / 2, y)
              ctx.lineTo(x + w, y + h / 2)
              ctx.lineTo(x + w / 2, y + h)
              ctx.lineTo(x, y + h / 2)
              ctx.closePath()
              ctx.fill()
              ctx.stroke()
              break

            case 'connector':
              ctx.arc(x + w / 2, y + h / 2, Math.min(w, h) / 2, 0, Math.PI * 2)
              ctx.fill()
              ctx.stroke()
              break

            case 'data': {
              const skew = 20
              ctx.moveTo(x + skew, y)
              ctx.lineTo(x + w, y)
              ctx.lineTo(x + w - skew, y + h)
              ctx.lineTo(x, y + h)
              ctx.closePath()
              ctx.fill()
              ctx.stroke()
              break
            }

            case 'document': {
              const waveHeight = 15
              ctx.moveTo(x, y)
              ctx.lineTo(x + w, y)
              ctx.lineTo(x + w, y + h - waveHeight)
              ctx.quadraticCurveTo(x + w * 0.75, y + h, x + w / 2, y + h - waveHeight)
              ctx.quadraticCurveTo(x + w * 0.25, y + h - waveHeight * 2, x, y + h - waveHeight)
              ctx.closePath()
              ctx.fill()
              ctx.stroke()
              break
            }

            case 'predefined-process': {
              const sideMargin = 15
              ctx.roundRect(x, y, w, h, 4)
              ctx.fill()
              ctx.stroke()
              ctx.beginPath()
              ctx.moveTo(x + sideMargin, y)
              ctx.lineTo(x + sideMargin, y + h)
              ctx.moveTo(x + w - sideMargin, y)
              ctx.lineTo(x + w - sideMargin, y + h)
              ctx.stroke()
              break
            }

            case 'delay':
              ctx.moveTo(x, y)
              ctx.lineTo(x + w * 0.7, y)
              ctx.quadraticCurveTo(x + w, y, x + w, y + h / 2)
              ctx.quadraticCurveTo(x + w, y + h, x + w * 0.7, y + h)
              ctx.lineTo(x, y + h)
              ctx.closePath()
              ctx.fill()
              ctx.stroke()
              break

            case 'manual-input': {
              const topSlant = 20
              ctx.moveTo(x, y + topSlant)
              ctx.lineTo(x + w, y)
              ctx.lineTo(x + w, y + h)
              ctx.lineTo(x, y + h)
              ctx.closePath()
              ctx.fill()
              ctx.stroke()
              break
            }

            case 'preparation': {
              const hexOffset = 25
              ctx.moveTo(x + hexOffset, y)
              ctx.lineTo(x + w - hexOffset, y)
              ctx.lineTo(x + w, y + h / 2)
              ctx.lineTo(x + w - hexOffset, y + h)
              ctx.lineTo(x + hexOffset, y + h)
              ctx.lineTo(x, y + h / 2)
              ctx.closePath()
              ctx.fill()
              ctx.stroke()
              break
            }

            case 'database': {
              const ellipseH = 15
              ctx.moveTo(x, y + ellipseH)
              ctx.lineTo(x, y + h - ellipseH)
              ctx.quadraticCurveTo(x, y + h, x + w / 2, y + h)
              ctx.quadraticCurveTo(x + w, y + h, x + w, y + h - ellipseH)
              ctx.lineTo(x + w, y + ellipseH)
              ctx.fill()
              ctx.stroke()
              ctx.beginPath()
              ctx.ellipse(x + w / 2, y + ellipseH, w / 2, ellipseH, 0, 0, Math.PI * 2)
              ctx.fill()
              ctx.stroke()
              break
            }

            case 'display': {
              const displayCurve = 30
              ctx.moveTo(x + displayCurve, y)
              ctx.lineTo(x + w, y)
              ctx.lineTo(x + w, y + h)
              ctx.lineTo(x + displayCurve, y + h)
              ctx.quadraticCurveTo(x, y + h / 2, x + displayCurve, y)
              ctx.fill()
              ctx.stroke()
              break
            }

            case 'manual-operation': {
              const trapOffset = 25
              ctx.moveTo(x + trapOffset, y)
              ctx.lineTo(x + w - trapOffset, y)
              ctx.lineTo(x + w, y + h)
              ctx.lineTo(x, y + h)
              ctx.closePath()
              ctx.fill()
              ctx.stroke()
              break
            }

            case 'loop-limit': {
              const loopOffset = 15
              ctx.moveTo(x + loopOffset, y)
              ctx.lineTo(x + w - loopOffset, y)
              ctx.lineTo(x + w, y + loopOffset)
              ctx.lineTo(x + w, y + h)
              ctx.lineTo(x, y + h)
              ctx.lineTo(x, y + loopOffset)
              ctx.closePath()
              ctx.fill()
              ctx.stroke()
              break
            }

            case 'merge':
              ctx.moveTo(x, y)
              ctx.lineTo(x + w, y)
              ctx.lineTo(x + w / 2, y + h)
              ctx.closePath()
              ctx.fill()
              ctx.stroke()
              break

            case 'or': {
              const orR = Math.min(w, h) / 2
              ctx.arc(x + w / 2, y + h / 2, orR, 0, Math.PI * 2)
              ctx.fill()
              ctx.stroke()
              ctx.beginPath()
              ctx.moveTo(x + w / 2, y)
              ctx.lineTo(x + w / 2, y + h)
              ctx.moveTo(x, y + h / 2)
              ctx.lineTo(x + w, y + h / 2)
              ctx.stroke()
              break
            }

            case 'summing-junction': {
              const sjR = Math.min(w, h) / 2
              const sjOffset = sjR * 0.707
              ctx.arc(x + w / 2, y + h / 2, sjR, 0, Math.PI * 2)
              ctx.fill()
              ctx.stroke()
              ctx.beginPath()
              ctx.moveTo(x + w / 2 - sjOffset, y + h / 2 - sjOffset)
              ctx.lineTo(x + w / 2 + sjOffset, y + h / 2 + sjOffset)
              ctx.moveTo(x + w / 2 + sjOffset, y + h / 2 - sjOffset)
              ctx.lineTo(x + w / 2 - sjOffset, y + h / 2 + sjOffset)
              ctx.stroke()
              break
            }

            case 'collate':
              ctx.moveTo(x, y)
              ctx.lineTo(x + w, y)
              ctx.lineTo(x + w / 2, y + h / 2)
              ctx.closePath()
              ctx.fill()
              ctx.stroke()
              ctx.beginPath()
              ctx.moveTo(x + w / 2, y + h / 2)
              ctx.lineTo(x + w, y + h)
              ctx.lineTo(x, y + h)
              ctx.closePath()
              ctx.fill()
              ctx.stroke()
              break

            case 'sort':
              ctx.moveTo(x + w / 2, y)
              ctx.lineTo(x + w, y + h / 2)
              ctx.lineTo(x + w / 2, y + h)
              ctx.lineTo(x, y + h / 2)
              ctx.closePath()
              ctx.fill()
              ctx.stroke()
              ctx.beginPath()
              ctx.moveTo(x, y + h / 2)
              ctx.lineTo(x + w, y + h / 2)
              ctx.stroke()
              break

            case 'stored-data': {
              const sdCurve = 20
              ctx.moveTo(x + sdCurve, y)
              ctx.lineTo(x + w, y)
              ctx.quadraticCurveTo(x + w - sdCurve, y + h / 2, x + w, y + h)
              ctx.lineTo(x + sdCurve, y + h)
              ctx.quadraticCurveTo(x, y + h / 2, x + sdCurve, y)
              ctx.fill()
              ctx.stroke()
              break
            }

            case 'internal-storage': {
              const isMargin = 15
              ctx.roundRect(x, y, w, h, 4)
              ctx.fill()
              ctx.stroke()
              ctx.beginPath()
              ctx.moveTo(x, y + isMargin)
              ctx.lineTo(x + w, y + isMargin)
              ctx.moveTo(x + isMargin, y)
              ctx.lineTo(x + isMargin, y + h)
              ctx.stroke()
              break
            }

            default:
              ctx.roundRect(x, y, w, h, 8)
              ctx.fill()
              ctx.stroke()
          }
        }
        drawShape()

        if (node.label) {
          ctx.fillStyle = '#1e293b'
          ctx.font = '14px Inter, sans-serif'
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText(node.label, x + w / 2, y + h / 2, w - 16)
        }
      })

      const { connections } = useFlowchartStore.getState()
      connections.forEach((conn) => {
        const fromNode = nodes.find((n) => n.id === conn.from)
        const toNode = nodes.find((n) => n.id === conn.to)
        if (!fromNode || !toNode) return

        const getAnchorPos = (node: typeof fromNode, anchor: string) => {
          const x = node.position.x - minX + padding
          const y = node.position.y - minY + padding
          const w = node.size.width
          const h = node.size.height
          const centerX = x + w / 2
          const centerY = y + h / 2

          if (node.type === 'connector') {
            const radius = Math.min(w, h) / 2
            switch (anchor) {
              case 'top': return { x: centerX, y: centerY - radius }
              case 'right': return { x: centerX + radius, y: centerY }
              case 'bottom': return { x: centerX, y: centerY + radius }
              case 'left': return { x: centerX - radius, y: centerY }
              default: return { x: centerX, y: centerY }
            }
          }

          if (node.type === 'document' && anchor === 'bottom') {
            const waveHeight = 15
            return { x: centerX, y: y + h - waveHeight }
          }

          switch (anchor) {
            case 'top': return { x: centerX, y }
            case 'right': return { x: x + w, y: centerY }
            case 'bottom': return { x: centerX, y: y + h }
            case 'left': return { x, y: centerY }
            default: return { x: centerX, y: centerY }
          }
        }

        const start = getAnchorPos(fromNode, conn.fromAnchor)
        const end = getAnchorPos(toNode, conn.toAnchor)

        const getInitialDirection = (anchor: string) => {
          switch (anchor) {
            case 'top': return { x: 0, y: -1 }
            case 'bottom': return { x: 0, y: 1 }
            case 'left': return { x: -1, y: 0 }
            case 'right': return { x: 1, y: 0 }
            default: return { x: 0, y: 1 }
          }
        }

        const calculateOrthogonalPath = () => {
          if (conn.waypoints && conn.waypoints.length > 0) {
            const adjustedWaypoints = conn.waypoints.map(wp => ({
              x: wp.x - minX + padding,
              y: wp.y - minY + padding
            }))
            return [start, ...adjustedWaypoints, end]
          }

          const startDir = getInitialDirection(conn.fromAnchor)
          const endDir = getInitialDirection(conn.toAnchor)
          const points = [start]
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

        const points = calculateOrthogonalPath()

        ctx.strokeStyle = '#64748b'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(points[0].x, points[0].y)
        for (let i = 1; i < points.length; i++) {
          ctx.lineTo(points[i].x, points[i].y)
        }
        ctx.stroke()

        // Dibujar flecha al final de la conexión
        const lastTwo = points.slice(-2)
        const angle = Math.atan2(lastTwo[1].y - lastTwo[0].y, lastTwo[1].x - lastTwo[0].x)
        const arrowSize = 12
        const arrowEnd = lastTwo[1] // Usar el último punto real del path

        ctx.fillStyle = '#64748b'
        ctx.beginPath()
        ctx.moveTo(arrowEnd.x, arrowEnd.y)
        ctx.lineTo(
          arrowEnd.x - arrowSize * Math.cos(angle - Math.PI / 6),
          arrowEnd.y - arrowSize * Math.sin(angle - Math.PI / 6)
        )
        ctx.lineTo(
          arrowEnd.x - arrowSize * Math.cos(angle + Math.PI / 6),
          arrowEnd.y - arrowSize * Math.sin(angle + Math.PI / 6)
        )
        ctx.closePath()
        ctx.fill()

        if (conn.label && points.length >= 2) {
          const midIndex = Math.min(Math.floor(points.length / 2), points.length - 1)
          const prevIndex = Math.max(0, midIndex - 1)
          const midX = (points[prevIndex].x + points[midIndex].x) / 2
          const midY = (points[prevIndex].y + points[midIndex].y) / 2
          ctx.fillStyle = '#ffffff'
          ctx.font = '12px Inter, sans-serif'
          const labelWidth = ctx.measureText(conn.label).width + 8
          ctx.fillRect(midX - labelWidth / 2, midY - 10, labelWidth, 18)
          ctx.fillStyle = '#1e293b'
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText(conn.label, midX, midY)
        }
      })

      const imgData = tempCanvas.toDataURL('image/png')

      let tableHeight = 0
      const { traceTableData: currentTraceTable } = useWebLLMStore.getState()

      if (currentTraceTable && currentTraceTable.rows.length > 0) {
        const rowHeight = 30
        const headerHeight = 40
        const titleHeight = 60
        const analysisHeight = currentTraceTable.flowAnalysis ? 80 : 0
        tableHeight = titleHeight + analysisHeight + headerHeight + (currentTraceTable.rows.length * rowHeight) + 40
      }

      const totalHeight = contentHeight + 40 + tableHeight
      const orientation = contentWidth > totalHeight ? 'landscape' : 'portrait'
      const pdf = new jsPDF({
        orientation: orientation as 'landscape' | 'portrait',
        unit: 'px',
        format: [contentWidth + 40, totalHeight],
      })

      pdf.addImage(imgData, 'PNG', 20, 20, contentWidth, contentHeight)

      if (currentTraceTable && currentTraceTable.rows.length > 0) {
        const tableStartY = contentHeight + 60

        pdf.setFontSize(18)
        pdf.setTextColor(30, 41, 59)
        pdf.text('Prueba de Escritorio', 20, tableStartY)

        let currentY = tableStartY + 20

        // Análisis del flujo
        if (currentTraceTable.flowAnalysis) {
          pdf.setFontSize(10)
          pdf.setTextColor(100, 116, 139)
          const analysisLines = pdf.splitTextToSize(currentTraceTable.flowAnalysis, contentWidth - 40)
          pdf.text(analysisLines, 20, currentY)
          currentY += analysisLines.length * 12 + 20
        }

        const numCols = currentTraceTable.columns.length + 1
        const colWidth = Math.min(120, (contentWidth - 40) / numCols)

        pdf.setFillColor(241, 245, 249)
        pdf.rect(20, currentY, colWidth * numCols, 30, 'F')
        pdf.setFontSize(10)
        pdf.setTextColor(30, 41, 59)

        pdf.text('#', 25, currentY + 20)

        currentTraceTable.columns.forEach((col, i) => {
          const x = 20 + colWidth * (i + 1)
          const label = col.label.length > 15 ? col.label.substring(0, 15) + '...' : col.label
          pdf.text(label, x + 5, currentY + 20)
        })

        currentY += 30

        currentTraceTable.rows.forEach((row, rowIndex) => {
          if (rowIndex % 2 === 0) {
            pdf.setFillColor(248, 250, 252)
            pdf.rect(20, currentY, colWidth * numCols, 25, 'F')
          }

          pdf.setTextColor(30, 41, 59)
          pdf.text(String(row.iteration || rowIndex + 1), 25, currentY + 17)

          currentTraceTable.columns.forEach((col, i) => {
            const x = 20 + colWidth * (i + 1)
            const value = row.values[col.nodeId] || '-'
            const truncatedValue = value.length > 15 ? value.substring(0, 15) + '...' : value
            pdf.text(truncatedValue, x + 5, currentY + 17)
          })

          currentY += 25
        })

        pdf.setDrawColor(226, 232, 240)
        pdf.rect(20, tableStartY + (currentTraceTable.flowAnalysis ? 60 : 40), colWidth * numCols, 30 + currentTraceTable.rows.length * 25)
      }

      const timestamp = new Date().toISOString().slice(0, 10)
      pdf.save(`diagrama-flujo-${timestamp}.pdf`)
    } catch (error) {
      console.error('Error al exportar PDF:', error)
      toast.error('Error al exportar el diagrama. Por favor intenta de nuevo.')
    }
  }, [nodes, clearSelection, traceTableData])

  return (
    <Box className="flex flex-col h-screen w-screen overflow-hidden">
      <CanvasToolbar onExportPDF={handleExportPDF} />
      <Box className="flex flex-1 overflow-hidden">
        <ShapesSidebar />
        <Box className="flex-1 relative">
          <InfiniteCanvas onDrop={handleDrop} canvasRef={canvasRef} />
          <PropertiesPanel />
          <KeyboardShortcuts />
        </Box>
      </Box>
    </Box>
  )
}
