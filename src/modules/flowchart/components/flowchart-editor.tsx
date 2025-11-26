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

        if (node.type === 'start-end') {
          ctx.beginPath()
          ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2)
          ctx.fill()
          ctx.stroke()
        } else if (node.type === 'decision') {
          ctx.beginPath()
          ctx.moveTo(x + w / 2, y)
          ctx.lineTo(x + w, y + h / 2)
          ctx.lineTo(x + w / 2, y + h)
          ctx.lineTo(x, y + h / 2)
          ctx.closePath()
          ctx.fill()
          ctx.stroke()
        } else if (node.type === 'connector') {
          ctx.beginPath()
          ctx.arc(x + w / 2, y + h / 2, Math.min(w, h) / 2, 0, Math.PI * 2)
          ctx.fill()
          ctx.stroke()
        } else {
          ctx.beginPath()
          ctx.roundRect(x, y, w, h, 8)
          ctx.fill()
          ctx.stroke()
        }

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

          switch (anchor) {
            case 'top': return { x: x + w / 2, y }
            case 'right': return { x: x + w, y: y + h / 2 }
            case 'bottom': return { x: x + w / 2, y: y + h }
            case 'left': return { x, y: y + h / 2 }
            default: return { x: x + w / 2, y: y + h / 2 }
          }
        }

        const start = getAnchorPos(fromNode, conn.fromAnchor)
        const end = getAnchorPos(toNode, conn.toAnchor)

        ctx.strokeStyle = '#64748b'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(start.x, start.y)
        ctx.lineTo(end.x, end.y)
        ctx.stroke()

        const angle = Math.atan2(end.y - start.y, end.x - start.x)
        const arrowSize = 10
        ctx.fillStyle = '#64748b'
        ctx.beginPath()
        ctx.moveTo(end.x, end.y)
        ctx.lineTo(
          end.x - arrowSize * Math.cos(angle - Math.PI / 6),
          end.y - arrowSize * Math.sin(angle - Math.PI / 6)
        )
        ctx.lineTo(
          end.x - arrowSize * Math.cos(angle + Math.PI / 6),
          end.y - arrowSize * Math.sin(angle + Math.PI / 6)
        )
        ctx.closePath()
        ctx.fill()
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
