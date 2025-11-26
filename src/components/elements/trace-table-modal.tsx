'use client'

import React, { useState, useCallback, useEffect, useRef } from 'react'
import { useTheme } from 'next-themes'
import { toast } from 'sonner'
import {
  Box,
  Typography,
  Button,
  IconButton,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  LinearProgress,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Tooltip,
  Chip,
  Alert,
  CircularProgress,
} from '@mui/material'
import {
  Play24Regular,
  Settings24Regular,
  Sparkle24Regular,
  ArrowDownload24Regular,
  Edit24Regular,
  Checkmark24Regular,
  ChevronDown24Regular,
  ChevronUp24Regular,
  Info24Regular,
  Eye24Regular,
} from '@fluentui/react-icons'
import { motion, AnimatePresence } from 'framer-motion'
import { CustomModal } from './custom-modal'
import { useWebLLMStore, AVAILABLE_MODELS } from '@/modules/flowchart/hooks/use-webllm-store'
import { useFlowchartStore } from '@/modules/flowchart/hooks/use-flowchart-store'
import { TraceTableRow } from '@/interfaces/flowchart'
import { v4 as uuid } from 'uuid'

interface TraceTableModalProps {
  open: boolean
  onClose: () => void
}

type ModalStep = 'setup' | 'loading' | 'table'
type ViewMode = 'all' | 'summary' | 'start' | 'end'

const VIEW_MODE_LABELS: Record<ViewMode, string> = {
  all: 'Completo',
  summary: 'Resumen',
  start: 'Inicio',
  end: 'Final',
}

export function TraceTableModal({ open, onClose }: TraceTableModalProps) {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'

  const [step, setStep] = useState<ModalStep>('setup')
  const [editingColumn, setEditingColumn] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [aiContext, setAiContext] = useState('')
  const [showContext, setShowContext] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>('all')
  const [testCountInput, setTestCountInput] = useState('10')
  const engineRef = useRef<unknown>(null)

  const { nodes, connections } = useFlowchartStore()

  const {
    isModelLoaded,
    isLoading,
    selectedModelId,
    loadProgress,
    testCount,
    traceTableData,
    isGenerating,
    setSelectedModel,
    setLoadProgress,
    setIsLoading,
    setIsModelLoaded,
    setTestCount,
    setTraceTableData,
    updateColumnLabel,
    setIsGenerating,
    generateTraceTable,
    setEngine,
  } = useWebLLMStore()

  useEffect(() => {
    if (open) {
      if (isLoading) {
        setStep('loading')
      } else if (isModelLoaded && traceTableData) {
        setStep('table')
      } else {
        setStep('setup')
      }
    }
  }, [open, isLoading, isModelLoaded, traceTableData])

  useEffect(() => {
    setTestCountInput(testCount.toString())
  }, [testCount])

  const handleTestCountChange = useCallback((value: string) => {
    setTestCountInput(value)
    const num = parseInt(value)
    if (!isNaN(num) && num >= 3 && num <= 50) {
      setTestCount(num)
    }
  }, [setTestCount])

  const handleTestCountBlur = useCallback(() => {
    const num = parseInt(testCountInput)
    if (isNaN(num) || num < 3) {
      toast.info('Se establece el número de pruebas mínimo a 3')
      setTestCountInput('3')
      setTestCount(3)
    } else if (num > 50) {
      toast.info('Se establece el número de pruebas máximo a 50')
      setTestCountInput('50')
      setTestCount(50)
    }
  }, [testCountInput, setTestCount])

  const nodesRef = useRef(JSON.stringify(nodes.map(n => ({ id: n.id, label: n.label, type: n.type }))))
  const connectionsRef = useRef(JSON.stringify(connections.map(c => ({ from: c.from, to: c.to }))))

  useEffect(() => {
    const currentNodes = JSON.stringify(nodes.map(n => ({ id: n.id, label: n.label, type: n.type })))
    const currentConnections = JSON.stringify(connections.map(c => ({ from: c.from, to: c.to })))

    if (nodesRef.current !== currentNodes || connectionsRef.current !== currentConnections) {
      if (isModelLoaded) {
        const columns = generateTraceTable(nodes, connections)
        setTraceTableData({
          columns,
          rows: [],
          flowAnalysis: '',
          generatedAt: new Date(),
        })
      }
      nodesRef.current = currentNodes
      connectionsRef.current = currentConnections
    }
  }, [nodes, connections, isModelLoaded, generateTraceTable, setTraceTableData])

  const handleLoadModel = useCallback(async () => {
    const num = parseInt(testCountInput)
    if (isNaN(num) || num < 3) {
      toast.info('Se establece el número de pruebas mínimo a 3')
      setTestCountInput('3')
      setTestCount(3)
      return
    }
    if (num > 50) {
      toast.info('Se establece el número de pruebas máximo a 50')
      setTestCountInput('50')
      setTestCount(50)
      return
    }

    setStep('loading')
    setIsLoading(true)
    setLoadProgress({ text: 'Iniciando descarga del modelo...', progress: 0 })

    try {
      const webllm = await import('@mlc-ai/web-llm')

      const engine = await webllm.CreateMLCEngine(selectedModelId, {
        initProgressCallback: (progress) => {
          setLoadProgress({
            text: progress.text,
            progress: progress.progress * 100,
          })
        },
      })

      engineRef.current = engine
      setEngine(engine)
      setIsModelLoaded(true)
      setIsLoading(false)

      const columns = generateTraceTable(nodes, connections)
      setTraceTableData({
        columns,
        rows: [],
        flowAnalysis: '',
        generatedAt: new Date(),
      })

      setStep('table')
    } catch (error) {
      console.error('Error loading model:', error)
      setIsLoading(false)
      setLoadProgress({
        text: `Error: ${error instanceof Error ? error.message : 'Error desconocido'}`,
        progress: 0,
      })
    }
  }, [
    selectedModelId,
    nodes,
    connections,
    testCountInput,
    setIsLoading,
    setLoadProgress,
    setEngine,
    setIsModelLoaded,
    setTestCount,
    generateTraceTable,
    setTraceTableData,
  ])

  type ColumnType = 'init' | 'condition' | 'display' | 'increment' | 'connector' | 'input' | 'process' | 'output' | 'unknown'

  const analyzeFlowchart = useCallback(() => {
    const columns = traceTableData?.columns || []

    const analysis = {
      initVars: [] as { name: string; value: number }[],
      condition: null as { variable: string; operator: string; limit: number } | null,
      increment: null as { variable: string; delta: number } | null,
      columnTypes: {} as Record<string, ColumnType>,
      inputVars: [] as string[],
      operations: [] as { nodeId: string; variable: string; expression: string }[],
      outputVars: [] as { nodeId: string; variables: string[] }[],
      isLinearAlgorithm: false,
    }

    columns.forEach((col) => {
      const node = nodes.find((n) => n.id === col.nodeId)
      const label = col.label.trim()

      if (node?.type === 'connector') {
        analysis.columnTypes[col.nodeId] = 'connector'
        return
      }

      if (node?.type === 'data' && !label.includes('=')) {
        const vars = label.split(',').map(v => v.trim()).filter(v => v.length > 0)
        analysis.inputVars.push(...vars)
        analysis.columnTypes[col.nodeId] = 'input'
        return
      }

      if ((node?.type === 'display' || node?.type === 'document') && !label.includes('=')) {
        const vars = label.split(',').map(v => v.trim()).filter(v => v.length > 0)
        analysis.outputVars.push({ nodeId: col.nodeId, variables: vars })
        analysis.columnTypes[col.nodeId] = 'output'
        return
      }

      const condMatch = label.match(/^(\w+)\s*(<=|>=|<|>|==|!=)\s*(\d+)$/)
      if (condMatch && node?.type === 'decision') {
        analysis.condition = {
          variable: condMatch[1],
          operator: condMatch[2],
          limit: parseInt(condMatch[3]),
        }
        analysis.columnTypes[col.nodeId] = 'condition'
        return
      }

      const incMatch = label.match(/^(\w+)\s*=\s*\1\s*\+\s*(\d+)$/)
      if (incMatch) {
        analysis.increment = {
          variable: incMatch[1],
          delta: parseInt(incMatch[2]),
        }
        analysis.columnTypes[col.nodeId] = 'increment'
        return
      }

      const decMatch = label.match(/^(\w+)\s*=\s*\1\s*-\s*(\d+)$/)
      if (decMatch) {
        analysis.increment = {
          variable: decMatch[1],
          delta: -parseInt(decMatch[2]),
        }
        analysis.columnTypes[col.nodeId] = 'increment'
        return
      }

      const assignMatch = label.match(/^(\w+)\s*=\s*(.+)$/)
      if (assignMatch && node?.type === 'process') {
        analysis.operations.push({
          nodeId: col.nodeId,
          variable: assignMatch[1],
          expression: assignMatch[2],
        })
        analysis.columnTypes[col.nodeId] = 'process'
        return
      }

      const initPattern = /(\w+)\s*=\s*(\d+)/g
      const matches = [...label.matchAll(initPattern)]
      if (matches.length > 0 && node?.type !== 'decision') {
        const isIncrement = label.match(/(\w+)\s*=\s*\1\s*[\+\-]/)
        if (!isIncrement) {
          matches.forEach((match) => {
            analysis.initVars.push({
              name: match[1],
              value: parseInt(match[2]),
            })
          })
          analysis.columnTypes[col.nodeId] = 'init'
          return
        }
      }

      const displayPattern = /^[\w\s,]+$/
      if (node?.type === 'display' || node?.type === 'data' || displayPattern.test(label)) {
        if (!label.includes('=') && !label.match(/(<=|>=|<|>)/)) {
          analysis.columnTypes[col.nodeId] = 'display'
          return
        }
      }

      analysis.columnTypes[col.nodeId] = 'unknown'
    })

    analysis.isLinearAlgorithm = analysis.inputVars.length > 0 && !analysis.condition

    return analysis
  }, [traceTableData, nodes])

  const evaluateCondition = (value: number, operator: string, limit: number): boolean => {
    switch (operator) {
      case '<=': return value <= limit
      case '>=': return value >= limit
      case '<': return value < limit
      case '>': return value > limit
      case '==': return value === limit
      case '!=': return value !== limit
      default: return false
    }
  }

  const evaluateExpression = (expression: string, variables: Record<string, number>): number => {
    try {
      let expr = expression
      Object.entries(variables).forEach(([name, value]) => {
        expr = expr.replace(new RegExp(`\\b${name}\\b`, 'g'), value.toString())
      })
      expr = expr.replace(/\s+/g, '')
      const result = Function(`"use strict"; return (${expr})`)()
      return typeof result === 'number' && !isNaN(result) ? result : 0
    } catch {
      return 0
    }
  }

  const generateTestInputs = (count: number): number[] => {
    const inputs: number[] = []
    for (let i = 0; i < count; i++) {
      inputs.push(Math.floor(Math.random() * 100) + 1)
    }
    return inputs
  }

  const generateLoopRow = useCallback((
    iteration: number,
    currentValue: number,
    flowAnalysis: ReturnType<typeof analyzeFlowchart>,
    columns: NonNullable<typeof traceTableData>['columns'],
    varState: Record<string, number>
  ) => {
    const { variable: condVar, operator, limit } = flowAnalysis.condition!
    const { variable: incVar, delta } = flowAnalysis.increment!
    const conditionResult = evaluateCondition(currentValue, operator, limit)
    const values: Record<string, string> = {}

    columns.forEach((col) => {
      const colType = flowAnalysis.columnTypes[col.nodeId]
      const label = col.label.trim()

      switch (colType) {
        case 'init':
          if (iteration === 1) {
            const initStr = flowAnalysis.initVars
              .map((v) => `${v.name} = ${v.value}`)
              .join(', ')
            values[col.nodeId] = initStr
          } else {
            values[col.nodeId] = '-'
          }
          break

        case 'condition':
          values[col.nodeId] = conditionResult ? 'Sí' : 'No'
          break

        case 'display':
          if (conditionResult) {
            const varNames = label.split(',').map((v) => v.trim())
            const displayValues = varNames.map((name) => {
              if (name === incVar) return currentValue
              const val = varState[name]
              return val !== undefined ? val : name
            })
            values[col.nodeId] = `imprimir ${displayValues.join(', ')}`
          } else {
            values[col.nodeId] = '-'
          }
          break

        case 'increment':
          if (conditionResult) {
            const newValue = currentValue + delta
            values[col.nodeId] = `${incVar} = ${newValue}`
          } else {
            values[col.nodeId] = '-'
          }
          break

        case 'connector':
          values[col.nodeId] = conditionResult ? `Ir a ${label}` : '-'
          break

        default:
          values[col.nodeId] = '-'
      }
    })

    return { values, conditionResult }
  }, [traceTableData])

  const handleGenerateTests = useCallback(async () => {
    if (!traceTableData) return

    setIsGenerating(true)

    try {
      const flowAnalysis = analyzeFlowchart()
      const columns = traceTableData.columns
      const rows: TraceTableRow[] = []

      if (flowAnalysis.initVars.length > 0 && flowAnalysis.condition && flowAnalysis.increment) {
        const { variable: condVar, operator, limit } = flowAnalysis.condition
        const { delta } = flowAnalysis.increment
        const initValue = flowAnalysis.initVars.find(v => v.name === condVar)?.value || 0

        const baseVarState: Record<string, number> = {}
        flowAnalysis.initVars.forEach((v) => {
          if (v.name !== condVar) {
            baseVarState[v.name] = v.value
          }
        })

        // O(1) calculation of total iterations
        let algorithmIterations = 0
        const MAX_SAFE_ITERATIONS = 10000

        if (delta > 0) {
          switch (operator) {
            case '<=':
              algorithmIterations = Math.max(0, Math.floor((limit - initValue) / delta) + 1)
              break
            case '<':
              algorithmIterations = Math.max(0, Math.floor((limit - initValue - 1) / delta) + 1)
              break
            case '>=':
            case '>':
              algorithmIterations = evaluateCondition(initValue, operator, limit) ? 1 : 0
              break
            default:
              algorithmIterations = 1
          }
        } else if (delta < 0) {
          const absDelta = Math.abs(delta)
          switch (operator) {
            case '>=':
              algorithmIterations = Math.max(0, Math.floor((initValue - limit) / absDelta) + 1)
              break
            case '>':
              algorithmIterations = Math.max(0, Math.floor((initValue - limit - 1) / absDelta) + 1)
              break
            case '<=':
            case '<':
              algorithmIterations = evaluateCondition(initValue, operator, limit) ? 1 : 0
              break
            default:
              algorithmIterations = 1
          }
        }

        algorithmIterations = Math.min(algorithmIterations, MAX_SAFE_ITERATIONS) + 1

        if (viewMode === 'summary' && algorithmIterations > 6) {
          const thirdSize = Math.max(2, Math.ceil(algorithmIterations / 3))

          let currentValue = initValue
          for (let i = 0; i < thirdSize && i < algorithmIterations; i++) {
            const { values, conditionResult } = generateLoopRow(
              i + 1, currentValue, flowAnalysis, columns, baseVarState
            )
            rows.push({ id: uuid(), values, iteration: i + 1 })
            if (!conditionResult) break
            currentValue += delta
          }

          const lastThirdStart = algorithmIterations - thirdSize
          if (lastThirdStart > thirdSize) {
            currentValue = initValue + (lastThirdStart * delta)
            for (let i = lastThirdStart; i < algorithmIterations; i++) {
              const { values, conditionResult } = generateLoopRow(
                i + 1, currentValue, flowAnalysis, columns, baseVarState
              )
              rows.push({ id: uuid(), values, iteration: i + 1 })
              if (!conditionResult) break
              currentValue += delta
            }
          }
        } else {
          const iterationsToGenerate = Math.min(testCount, algorithmIterations)
          let currentValue = initValue
          for (let i = 0; i < iterationsToGenerate; i++) {
            const { values, conditionResult } = generateLoopRow(
              i + 1, currentValue, flowAnalysis, columns, baseVarState
            )
            rows.push({ id: uuid(), values, iteration: i + 1 })
            if (!conditionResult) break
            currentValue += delta
          }
        }
      } else if (flowAnalysis.isLinearAlgorithm) {
        const testInputs = generateTestInputs(testCount)

        for (let i = 0; i < testCount; i++) {
          const values: Record<string, string> = {}
          const varState: Record<string, number> = {}

          flowAnalysis.inputVars.forEach((varName, idx) => {
            varState[varName] = testInputs[i]
          })

          columns.forEach((col) => {
            const colType = flowAnalysis.columnTypes[col.nodeId]
            const label = col.label.trim()

            switch (colType) {
              case 'input':
                const inputVars = label.split(',').map(v => v.trim())
                const inputValues = inputVars.map(v => varState[v] ?? '?')
                values[col.nodeId] = inputValues.join(', ')
                break

              case 'process':
                const op = flowAnalysis.operations.find(o => o.nodeId === col.nodeId)
                if (op) {
                  const result = evaluateExpression(op.expression, varState)
                  varState[op.variable] = result
                  values[col.nodeId] = `${op.variable} = ${result}`
                } else {
                  values[col.nodeId] = '-'
                }
                break

              case 'output':
                const outVars = flowAnalysis.outputVars.find(o => o.nodeId === col.nodeId)
                if (outVars) {
                  const outValues = outVars.variables.map(v => varState[v] ?? v)
                  values[col.nodeId] = outValues.join(', ')
                } else {
                  values[col.nodeId] = '-'
                }
                break

              case 'display':
                const displayVars = label.split(',').map(v => v.trim())
                const displayValues = displayVars.map(v => varState[v] ?? v)
                values[col.nodeId] = displayValues.join(', ')
                break

              default:
                values[col.nodeId] = '-'
            }
          })

          rows.push({
            id: uuid(),
            values,
            iteration: i + 1,
          })
        }
      } else {
        for (let i = 0; i < Math.min(testCount, 10); i++) {
          const values: Record<string, string> = {}
          columns.forEach((col) => {
            values[col.nodeId] = '-'
          })
          rows.push({
            id: uuid(),
            values,
            iteration: i + 1,
          })
        }
      }

      let analysis = ''
      if (engineRef.current) {
        const engine = engineRef.current as {
          chat: {
            completions: {
              create: (params: {
                messages: { role: string; content: string }[]
                temperature: number
                max_tokens: number
              }) => Promise<{ choices: { message: { content: string } }[] }>
            }
          }
        }

        const flowDescription = columns.map((col, i) => `${i + 1}. ${col.label}`).join('\n')
        const contextInfo = aiContext.trim() ? `\n\nContexto adicional proporcionado por el usuario:\n${aiContext.trim()}` : ''
        const analysisPrompt = `Describe en 2 oraciones qué hace este algoritmo:\n${flowDescription}${contextInfo}`

        try {
          const analysisResponse = await engine.chat.completions.create({
            messages: [{ role: 'user', content: analysisPrompt }],
            temperature: 0.5,
            max_tokens: 150,
          })
          analysis = analysisResponse.choices[0]?.message?.content || ''
        } catch {
          analysis = ''
        }
      }

      setTraceTableData({
        ...traceTableData,
        rows,
        flowAnalysis: analysis,
        generatedAt: new Date(),
      })
    } catch (error) {
      console.error('Error generating tests:', error)
    } finally {
      setIsGenerating(false)
    }
  }, [traceTableData, testCount, viewMode, analyzeFlowchart, generateLoopRow, aiContext, setIsGenerating, setTraceTableData])

  const handleStartEdit = (nodeId: string, currentLabel: string) => {
    setEditingColumn(nodeId)
    setEditValue(currentLabel)
  }

  const handleSaveEdit = () => {
    if (editingColumn) {
      updateColumnLabel(editingColumn, editValue)
      setEditingColumn(null)
      setEditValue('')
    }
  }

  const getFilteredRows = useCallback(() => {
    const rows = traceTableData?.rows || []
    if (rows.length === 0) return { rows, showEllipsis: false, ellipsisIndex: -1 }

    const isOptimized = rows.length >= 2 &&
      rows[rows.length - 1].iteration &&
      rows[0].iteration &&
      (rows[rows.length - 1].iteration! - rows[0].iteration!) > rows.length

    const thirdSize = Math.max(1, Math.ceil(rows.length / 3))

    switch (viewMode) {
      case 'all':
        return { rows, showEllipsis: false, ellipsisIndex: -1 }
      case 'summary': {
        if (isOptimized && rows.length >= 2) {
          let gapIndex = -1
          for (let i = 1; i < rows.length; i++) {
            if (rows[i].iteration! - rows[i - 1].iteration! > 1) {
              gapIndex = i
              break
            }
          }
          if (gapIndex > 0) {
            const hiddenCount = rows[gapIndex].iteration! - rows[gapIndex - 1].iteration! - 1
            return {
              rows,
              showEllipsis: true,
              ellipsisIndex: gapIndex,
              hiddenCount,
            }
          }
        }

        if (rows.length < 3) return { rows, showEllipsis: false, ellipsisIndex: -1 }
        const startRows = rows.slice(0, thirdSize)
        const endRows = rows.slice(-thirdSize)
        const hiddenCount = rows.length - (thirdSize * 2)
        if (hiddenCount <= 0) return { rows, showEllipsis: false, ellipsisIndex: -1 }
        return {
          rows: [...startRows, ...endRows],
          showEllipsis: true,
          ellipsisIndex: thirdSize,
          hiddenCount,
        }
      }
      case 'start':
        return { rows: rows.slice(0, thirdSize), showEllipsis: false, ellipsisIndex: -1 }
      case 'end':
        return { rows: rows.slice(-thirdSize), showEllipsis: false, ellipsisIndex: -1 }
      default:
        return { rows, showEllipsis: false, ellipsisIndex: -1 }
    }
  }, [traceTableData?.rows, viewMode])

  const filterResult = getFilteredRows()
  const filteredRows = filterResult.rows
  const showEllipsis = filterResult.showEllipsis
  const ellipsisIndex = filterResult.ellipsisIndex
  const hiddenCount = (filterResult as { hiddenCount?: number }).hiddenCount || 0

  const selectedModel = AVAILABLE_MODELS.find((m) => m.id === selectedModelId)

  return (
    <CustomModal
      open={open}
      onClose={onClose}
      title="Prueba de Escritorio"
      icon={<Sparkle24Regular />}
      maxWidth={step === 'table' ? 900 : 500}
    >
      <AnimatePresence mode="wait">
        {step === 'setup' && (
          <motion.div
            key="setup"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
          >
            <Alert severity="info" sx={{ mb: 3, mt: 2 }}>
              Esta funcionalidad descargará un modelo de IA local en tu navegador para realizar
              las comprobaciones automáticas de la prueba de escritorio. El modelo se ejecuta
              completamente en tu dispositivo, sin enviar datos a servidores externos.
            </Alert>

            <FormControl fullWidth sx={{ mb: 3 }}>
              <InputLabel>Modelo de IA</InputLabel>
              <Select
                value={selectedModelId}
                label="Modelo de IA"
                onChange={(e) => setSelectedModel(e.target.value)}
                sx={{
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: isDark ? '#334155' : '#e2e8f0',
                  },
                }}
              >
                {AVAILABLE_MODELS.map((model) => (
                  <MenuItem key={model.id} value={model.id}>
                    <Box>
                      <Typography variant="body2" fontWeight={500}>
                        {model.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {model.size} - {model.description}
                      </Typography>
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Box className="flex items-center gap-3 mb-4">
              <TextField
                type="text"
                label="Cantidad de pruebas (3-50)"
                value={testCountInput}
                onChange={(e) => handleTestCountChange(e.target.value.replace(/\D/g, ''))}
                onBlur={handleTestCountBlur}
                size="small"
                sx={{
                  width: 200,
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: isDark ? '#334155' : '#e2e8f0',
                  },
                }}
              />
              <Typography variant="caption" color="text.secondary">
                Mínimo 3, máximo 50
              </Typography>
            </Box>

            <Box className="flex gap-2 justify-end" mt={2}>
              <Button
                variant="outlined"
                onClick={onClose}
                sx={{
                  textTransform: 'none',
                  borderColor: isDark ? '#334155' : '#e2e8f0',
                  color: isDark ? 'grey.300' : 'grey.700',
                }}
              >
                Cancelar
              </Button>
              <Button
                variant="contained"
                onClick={handleLoadModel}
                startIcon={<ArrowDownload24Regular />}
                sx={{
                  textTransform: 'none',
                  background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                }}
              >
                Descargar Modelo e Iniciar
              </Button>
            </Box>
          </motion.div>
        )}

        {step === 'loading' && (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="py-8"
          >
            <Box className="text-center mb-6" mt={2}>
              <CircularProgress
                size={60}
                sx={{ color: isDark ? '#818cf8' : '#6366f1', mb: 3 }}
              />
              <Typography variant="h6" gutterBottom>
                Descargando modelo...
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {loadProgress?.text || 'Iniciando...'}
              </Typography>
            </Box>

            <LinearProgress

              variant="determinate"
              value={loadProgress?.progress || 0}
              sx={{
                mt: 2,
                height: 8,
                borderRadius: 4,
                backgroundColor: isDark ? '#1e293b' : '#e2e8f0',
                '& .MuiLinearProgress-bar': {
                  background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                  borderRadius: 4,
                },
              }}
            />

            <Typography variant="caption" color="text.secondary" className="block text-center mt-2">
              {Math.round(loadProgress?.progress || 0)}%
            </Typography>

            <Alert severity="warning" sx={{ mt: 4 }}>
              No cierres esta ventana mientras se descarga el modelo. Puedes continuar trabajando
              en el diagrama y volver cuando termine.
            </Alert>
          </motion.div>
        )}

        {step === 'table' && traceTableData && (
          <motion.div
            key="table"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}

          >
            {traceTableData.flowAnalysis && (
              <Alert severity="info" sx={{ mb: 3, mt: 2 }}>
                <Typography variant="subtitle2" fontWeight={600}>
                  Análisis del flujo:
                </Typography>
                {traceTableData.flowAnalysis}
              </Alert>
            )}

            <Box
              sx={{
                mb: 3,
                border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
                borderRadius: 1,
                overflow: 'hidden',
                mt: 2
              }}
            >
              <Box
                onClick={() => setShowContext(!showContext)}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  px: 2,
                  py: 1,
                  cursor: 'pointer',
                  backgroundColor: isDark ? '#1e293b' : '#f8fafc',
                  '&:hover': {
                    backgroundColor: isDark ? '#334155' : '#f1f5f9',
                  },
                }}
              >
                <Box className="flex items-center gap-2">
                  <Info24Regular style={{ fontSize: 18, color: isDark ? '#94a3b8' : '#64748b' }} />
                  <Typography variant="body2" fontWeight={500} color={isDark ? '#e2e8f0' : '#1e293b'}>
                    Contexto adicional para la IA (opcional)
                  </Typography>
                  {aiContext.trim() && (
                    <Chip
                      label="Con contexto"
                      size="small"
                      sx={{
                        height: 20,
                        fontSize: '0.7rem',
                        backgroundColor: isDark ? '#4c1d95' : '#ede9fe',
                        color: isDark ? '#c4b5fd' : '#7c3aed',
                      }}
                    />
                  )}
                </Box>
                {showContext ? (
                  <ChevronUp24Regular style={{ color: isDark ? '#94a3b8' : '#64748b' }} />
                ) : (
                  <ChevronDown24Regular style={{ color: isDark ? '#94a3b8' : '#64748b' }} />
                )}
              </Box>
              {showContext && (
                <Box sx={{ p: 2, backgroundColor: isDark ? '#0f172a' : '#ffffff' }}>
                  <TextField
                    multiline
                    rows={3}
                    fullWidth
                    placeholder="Escribe información adicional que ayude a la IA a entender mejor tu diagrama. Ej: 'Este es un algoritmo que calcula factorial', 'Las variables representan...'"
                    value={aiContext}
                    onChange={(e) => setAiContext(e.target.value)}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        backgroundColor: isDark ? '#1e293b' : '#f8fafc',
                        '& fieldset': {
                          borderColor: isDark ? '#334155' : '#e2e8f0',
                        },
                      },
                      '& .MuiInputBase-input': {
                        color: isDark ? '#e2e8f0' : '#1e293b',
                        fontSize: '0.875rem',
                      },
                    }}
                  />
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                    Este contexto se enviará a la IA para mejorar el análisis del flujo.
                  </Typography>
                </Box>
              )}
            </Box>

            <Box className="flex items-center justify-between mb-4 flex-wrap gap-2" mb={2}>
              <Box className="flex items-center gap-2 flex-wrap">
                <Chip
                  label={selectedModel?.name}
                  size="small"
                  sx={{
                    backgroundColor: isDark ? '#1e293b' : '#f1f5f9',
                    color: isDark ? '#94a3b8' : '#64748b',
                  }}
                />
                <Tooltip title="Mínimo 3, máximo 50 pruebas">
                  <TextField
                    type="text"
                    label="Pruebas (3-50)"
                    value={testCountInput}
                    onChange={(e) => handleTestCountChange(e.target.value.replace(/\D/g, ''))}
                    onBlur={handleTestCountBlur}
                    size="small"
                    sx={{
                      width: 150,
                      '& .MuiOutlinedInput-notchedOutline': {
                        borderColor: isDark ? '#334155' : '#e2e8f0',
                      },
                      '& .MuiInputBase-input': {
                        color: isDark ? '#e2e8f0' : '#1e293b',
                      },
                    }}
                  />
                </Tooltip>

                {traceTableData.rows.length > 0 && (
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.5,
                      ml: 1,
                      p: 0.5,
                      borderRadius: 1,
                      backgroundColor: isDark ? '#1e293b' : '#f1f5f9',
                      border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
                    }}
                  >
                    <Eye24Regular style={{ fontSize: 16, color: isDark ? '#94a3b8' : '#64748b', marginLeft: 4 }} />
                    {(['all', 'summary', 'start', 'end'] as ViewMode[]).map((mode) => (
                      <Tooltip key={mode} title={
                        mode === 'all' ? 'Ver todas las filas' :
                          mode === 'summary' ? 'Ver inicio y final' :
                            mode === 'start' ? 'Ver solo el inicio' :
                              'Ver solo el final'
                      }>
                        <Button
                          size="small"
                          onClick={() => setViewMode(mode)}
                          sx={{
                            minWidth: 'auto',
                            px: 1,
                            py: 0.25,
                            fontSize: '0.7rem',
                            textTransform: 'none',
                            backgroundColor: viewMode === mode
                              ? (isDark ? '#4c1d95' : '#ede9fe')
                              : 'transparent',
                            color: viewMode === mode
                              ? (isDark ? '#c4b5fd' : '#7c3aed')
                              : (isDark ? '#94a3b8' : '#64748b'),
                            '&:hover': {
                              backgroundColor: viewMode === mode
                                ? (isDark ? '#5b21b6' : '#ddd6fe')
                                : (isDark ? '#334155' : '#e2e8f0'),
                            },
                          }}
                        >
                          {VIEW_MODE_LABELS[mode]}
                        </Button>
                      </Tooltip>
                    ))}
                  </Box>
                )}
              </Box>

              <Button
                variant="contained"
                onClick={handleGenerateTests}
                disabled={isGenerating}
                startIcon={isGenerating ? <CircularProgress size={16} /> : <Play24Regular />}
                sx={{
                  textTransform: 'none',
                  background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                }}
              >
                {isGenerating ? 'Generando...' : 'Generar Pruebas'}
              </Button>
            </Box>

            <TableContainer
              component={Paper}
              sx={{
                maxHeight: 400,
                mb: 2,
                overflowX: 'auto',
                backgroundColor: isDark ? '#0f172a' : '#ffffff',
                border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
              }}
            >
              <Table stickyHeader size="small" sx={{ tableLayout: 'auto' }}>
                <TableHead>
                  <TableRow>
                    <TableCell
                      sx={{
                        backgroundColor: isDark ? '#1e293b' : '#f1f5f9',
                        color: isDark ? '#e2e8f0' : '#1e293b',
                        fontWeight: 600,
                        minWidth: 40,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      #
                    </TableCell>
                    {traceTableData.columns.map((column) => (
                      <TableCell
                        key={column.nodeId}
                        sx={{
                          backgroundColor: isDark ? '#1e293b' : '#f1f5f9',
                          color: isDark ? '#e2e8f0' : '#1e293b',
                          fontWeight: 600,
                          minWidth: 100,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {editingColumn === column.nodeId ? (
                          <Box className="flex items-center gap-1">
                            <TextField
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              size="small"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveEdit()
                                if (e.key === 'Escape') setEditingColumn(null)
                              }}
                              sx={{
                                '& .MuiInputBase-input': {
                                  fontSize: '0.875rem',
                                  padding: '4px 8px',
                                },
                              }}
                            />
                            <IconButton size="small" onClick={handleSaveEdit}>
                              <Checkmark24Regular />
                            </IconButton>
                          </Box>
                        ) : (
                          <Box className="flex items-center gap-1">
                            {column.label}
                            <Tooltip title="Editar nombre">
                              <IconButton
                                size="small"
                                onClick={() => handleStartEdit(column.nodeId, column.label)}
                              >
                                <Edit24Regular style={{ fontSize: 14 }} />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {traceTableData.rows.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={traceTableData.columns.length + 1}
                        sx={{ textAlign: 'center', py: 4 }}
                      >
                        <Typography variant="body2" color="text.secondary">
                          Haz clic en &quot;Generar Pruebas&quot; para crear los casos de prueba con IA
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    <>
                      {filteredRows.map((row, index) => (
                        <React.Fragment key={row.id}>
                          {showEllipsis && index === ellipsisIndex && (
                            <TableRow>
                              <TableCell
                                colSpan={traceTableData.columns.length + 1}
                                sx={{
                                  textAlign: 'center',
                                  py: 1,
                                  backgroundColor: isDark ? '#1e293b' : '#f1f5f9',
                                  borderTop: `1px dashed ${isDark ? '#475569' : '#cbd5e1'}`,
                                  borderBottom: `1px dashed ${isDark ? '#475569' : '#cbd5e1'}`,
                                }}
                              >
                                <Typography
                                  variant="body2"
                                  sx={{
                                    color: isDark ? '#64748b' : '#94a3b8',
                                    fontStyle: 'italic',
                                  }}
                                >
                                  ··· {hiddenCount} {hiddenCount === 1 ? 'fila oculta' : 'filas ocultas'} ···
                                </Typography>
                              </TableCell>
                            </TableRow>
                          )}
                          <TableRow
                            key={row.id}
                            sx={{
                              '&:nth-of-type(odd)': {
                                backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
                              },
                            }}
                          >
                            <TableCell
                              sx={{
                                color: isDark ? '#94a3b8' : '#64748b',
                                fontWeight: 500,
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {row.iteration || index + 1}
                            </TableCell>
                            {traceTableData.columns.map((column) => (
                              <TableCell
                                key={column.nodeId}
                                sx={{
                                  color: isDark ? '#e2e8f0' : '#1e293b',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {row.values[column.nodeId] || '-'}
                              </TableCell>
                            ))}
                          </TableRow>
                        </React.Fragment>
                      ))}
                    </>
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            <Box className="flex justify-between mt-4">
              <Button
                variant="outlined"
                onClick={() => {
                  setStep('setup')
                }}
                startIcon={<Settings24Regular />}
                sx={{
                  textTransform: 'none',
                  borderColor: isDark ? '#334155' : '#e2e8f0',
                  color: isDark ? 'grey.300' : 'grey.700',
                }}
              >
                Cambiar Modelo
              </Button>
              <Button
                variant="outlined"
                onClick={onClose}
                sx={{
                  textTransform: 'none',
                  borderColor: isDark ? '#334155' : '#e2e8f0',
                  color: isDark ? 'grey.300' : 'grey.700',
                }}
              >
                Cerrar
              </Button>
            </Box>
          </motion.div>
        )}
      </AnimatePresence>
    </CustomModal>
  )
}
