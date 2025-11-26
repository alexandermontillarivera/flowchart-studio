'use client'

import { useState, useCallback, useRef } from 'react'
import { useTheme } from 'next-themes'
import { Box, IconButton, Tooltip, Divider, Slider, Typography, Paper, Button, TextField, LinearProgress, CircularProgress } from '@mui/material'
import {
  ZoomIn24Regular,
  ZoomOut24Regular,
  ArrowReset24Regular,
  Delete24Regular,
  ArrowUndo24Regular,
  ArrowRedo24Regular,
  Save24Regular,
  ArrowDownload24Regular,
  ArrowUpload24Regular,
  WeatherMoon24Regular,
  WeatherSunny24Regular,
  Eye24Regular,
  Edit24Regular,
  Target24Regular,
  TableSimple24Regular,
} from '@fluentui/react-icons'
import { motion } from 'framer-motion'
import { useFlowchartStore } from '@/modules/flowchart/hooks/use-flowchart-store'
import { useWebLLMStore, AVAILABLE_MODELS } from '@/modules/flowchart/hooks/use-webllm-store'
import { CustomModal } from '@/components/elements/custom-modal'
import { TraceTableModal } from '@/components/elements/trace-table-modal'
import Image from 'next/image'
import Link from 'next/link'

interface CanvasToolbarProps {
  onExportPDF?: () => void
}

export function CanvasToolbar({ onExportPDF }: CanvasToolbarProps) {
  const { resolvedTheme, setTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [saveModalOpen, setSaveModalOpen] = useState(false)
  const [importModalOpen, setImportModalOpen] = useState(false)
  const [importData, setImportData] = useState('')
  const [importError, setImportError] = useState('')
  const [traceTableModalOpen, setTraceTableModalOpen] = useState(false)

  const {
    canvas,
    setZoom,
    setPan,
    deleteSelected,
    selectedNodeId,
    selectedConnectionId,
    isViewMode,
    toggleViewMode,
    exportData,
    importData: importDataToStore,
    centerOnContent,
    nodes,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useFlowchartStore()

  const {
    isLoading: isModelLoading,
    loadProgress,
    isModelLoaded,
    selectedModelId,
  } = useWebLLMStore()

  const selectedModel = AVAILABLE_MODELS.find((m) => m.id === selectedModelId)

  const hasSelection = selectedNodeId !== null || selectedConnectionId !== null

  const handleZoomIn = () => setZoom(Math.min(canvas.zoom * 1.2, 3))
  const handleZoomOut = () => setZoom(Math.max(canvas.zoom / 1.2, 0.1))
  const handleResetView = () => {
    setZoom(1)
    setPan({ x: 0, y: 0 })
  }

  const handleCenterOnContent = useCallback(() => {
    const viewportWidth = window.innerWidth - 280
    const viewportHeight = window.innerHeight - 56
    centerOnContent(viewportWidth, viewportHeight)
  }, [centerOnContent])

  const handleZoomSlider = (_: Event, value: number | number[]) => {
    setZoom(value as number)
  }

  const handleSave = useCallback(() => {
    setSaveModalOpen(true)
  }, [])

  const handleDownloadJson = useCallback(() => {
    const data = exportData()
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `diagrama-${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    setSaveModalOpen(false)
  }, [exportData])

  const handleOpenImport = useCallback(() => {
    setImportData('')
    setImportError('')
    setImportModalOpen(true)
  }, [])

  const handleImportFromText = useCallback(() => {
    const success = importDataToStore(importData)
    if (success) {
      setImportModalOpen(false)
      setImportData('')
      setImportError('')
    } else {
      setImportError('Formato de archivo inválido. Asegúrate de pegar un JSON válido.')
    }
  }, [importData, importDataToStore])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const content = event.target?.result as string
      const success = importDataToStore(content)
      if (success) {
        setImportModalOpen(false)
      } else {
        setImportError('Archivo inválido. Asegúrate de seleccionar un archivo JSON válido.')
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }, [importDataToStore])

  const zoomPercentage = Math.round(canvas.zoom * 100)

  const toolbarButtons = [
    {
      group: 'file',
      items: [
        { icon: <Save24Regular />, label: 'Guardar', action: handleSave, disabled: false },
        { icon: <ArrowUpload24Regular />, label: 'Importar', action: handleOpenImport, disabled: false },
        {
          icon: <ArrowDownload24Regular />,
          label: 'Exportar PDF',
          action: onExportPDF || (() => { }),
          disabled: !onExportPDF,
        },
      ],
    },
    {
      group: 'mode',
      items: [
        {
          icon: isViewMode ? <Edit24Regular /> : <Eye24Regular />,
          label: isViewMode ? 'Modo Edición' : 'Modo Vista',
          action: toggleViewMode,
          disabled: false,
        },
      ],
    },
    {
      group: 'edit',
      items: [
        { icon: <ArrowUndo24Regular />, label: 'Deshacer (Ctrl+Z)', action: undo, disabled: !canUndo() },
        { icon: <ArrowRedo24Regular />, label: 'Rehacer (Ctrl+Y)', action: redo, disabled: !canRedo() },
      ],
    },
    {
      group: 'actions',
      items: [
        {
          icon: <Delete24Regular />,
          label: 'Eliminar',
          action: deleteSelected,
          disabled: !hasSelection || isViewMode,
        },
      ],
    },
    {
      group: 'analysis',
      items: [
        {
          icon: <TableSimple24Regular />,
          label: 'Prueba de Escritorio',
          action: () => setTraceTableModalOpen(true),
          disabled: nodes.length === 0,
        },
      ],
    },
  ]

  return (
    <Paper
      component={motion.div}
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      elevation={0}
      className={`flex items-center gap-1 px-2 py-1.5 border-b ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'
        }`}
      sx={{
        p: "8px 16px",
        borderRadius: "0px"
      }}
    >

      <Box>
        <Link
          href="/"
        >
          <Image
            width={32}
            height={32}
            src="/logo.png"
            alt='Logo'
            style={{
              objectFit: 'contain',
              marginRight: "24px"
            }}
          />
        </Link>
      </Box>

      {toolbarButtons.map((group, groupIndex) => (
        <Box key={group.group} className="flex items-center">
          {groupIndex > 0 && (
            <Divider
              orientation="vertical"
              flexItem
              sx={{
                mx: 0.5,
                borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
              }}
            />
          )}
          {group.items.map((item) => (
            <Tooltip key={item.label} title={item.label} arrow>
              <span>
                <IconButton
                  size="small"
                  onClick={item.action}
                  disabled={item.disabled}
                  sx={{
                    color: isDark ? 'grey.400' : 'grey.600',
                    '&:hover': {
                      backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
                      color: isDark ? 'grey.100' : 'grey.900',
                    },
                    '&.Mui-disabled': {
                      color: isDark ? 'grey.700' : 'grey.400',
                    },
                  }}
                >
                  {item.icon}
                </IconButton>
              </span>
            </Tooltip>
          ))}
        </Box>
      ))}

      <Divider
        orientation="vertical"
        flexItem
        sx={{ mx: 0.5, borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }}
      />

      <Box className="flex items-center gap-1">
        <Tooltip title="Alejar" arrow>
          <IconButton
            size="small"
            onClick={handleZoomOut}
            sx={{
              color: isDark ? 'grey.400' : 'grey.600',
              '&:hover': {
                backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
              },
            }}
          >
            <ZoomOut24Regular />
          </IconButton>
        </Tooltip>

        <Box className="flex items-center gap-2 w-32">
          <Slider
            value={canvas.zoom}
            onChange={handleZoomSlider}
            min={0.1}
            max={3}
            step={0.1}
            size="small"
            sx={{
              color: isDark ? '#818cf8' : '#6366f1',
              '& .MuiSlider-thumb': {
                width: 14,
                height: 14,
              },
              '& .MuiSlider-track': {
                height: 3,
              },
              '& .MuiSlider-rail': {
                height: 3,
                backgroundColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)',
              },
            }}
          />
        </Box>

        <Typography
          variant="caption"
          className={`w-12 text-center ${isDark ? 'text-slate-400' : 'text-slate-600'}`}
        >
          {zoomPercentage}%
        </Typography>

        <Tooltip title="Acercar" arrow>
          <IconButton
            size="small"
            onClick={handleZoomIn}
            sx={{
              color: isDark ? 'grey.400' : 'grey.600',
              '&:hover': {
                backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
              },
            }}
          >
            <ZoomIn24Regular />
          </IconButton>
        </Tooltip>

        <Tooltip title="Restablecer Vista" arrow>
          <IconButton
            size="small"
            onClick={handleResetView}
            sx={{
              color: isDark ? 'grey.400' : 'grey.600',
              '&:hover': {
                backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
              },
            }}
          >
            <ArrowReset24Regular />
          </IconButton>
        </Tooltip>

        <Tooltip title="Centrar en Contenido" arrow>
          <span>
            <IconButton
              size="small"
              onClick={handleCenterOnContent}
              disabled={nodes.length === 0}
              sx={{
                color: isDark ? 'grey.400' : 'grey.600',
                '&:hover': {
                  backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
                },
                '&.Mui-disabled': {
                  color: isDark ? 'grey.700' : 'grey.400',
                },
              }}
            >
              <Target24Regular />
            </IconButton>
          </span>
        </Tooltip>
      </Box>

      <Box className="flex-1" />

      <Box className="flex items-center gap-2 mr-2">
        {isModelLoading && (
          <Tooltip title={`Descargando ${selectedModel?.name || 'modelo'}...`} arrow>
            <Box
              className="flex items-center gap-2 px-3 py-1 rounded-full cursor-pointer"
              onClick={() => setTraceTableModalOpen(true)}
              sx={{
                backgroundColor: isDark ? 'rgba(99, 102, 241, 0.2)' : 'rgba(99, 102, 241, 0.1)',
                '&:hover': {
                  backgroundColor: isDark ? 'rgba(99, 102, 241, 0.3)' : 'rgba(99, 102, 241, 0.15)',
                },
              }}
            >
              <CircularProgress
                size={14}
                thickness={5}
                sx={{ color: isDark ? '#818cf8' : '#6366f1' }}
              />
              <Typography
                variant="caption"
                sx={{
                  color: isDark ? '#818cf8' : '#6366f1',
                  fontWeight: 500,
                  fontSize: '0.7rem',
                }}
              >
                {Math.round(loadProgress?.progress || 0)}%
              </Typography>
            </Box>
          </Tooltip>
        )}

        {isModelLoaded && !isModelLoading && (
          <Tooltip title={`Modelo ${selectedModel?.name} listo`} arrow>
            <Box
              className="flex items-center gap-1 px-2 py-1 rounded-full cursor-pointer"
              onClick={() => setTraceTableModalOpen(true)}
              sx={{
                backgroundColor: isDark ? 'rgba(34, 197, 94, 0.2)' : 'rgba(34, 197, 94, 0.1)',
                '&:hover': {
                  backgroundColor: isDark ? 'rgba(34, 197, 94, 0.3)' : 'rgba(34, 197, 94, 0.15)',
                },
              }}
            >
              <Box
                sx={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  backgroundColor: '#22c55e',
                }}
              />
              <Typography
                variant="caption"
                sx={{
                  color: isDark ? '#22c55e' : '#16a34a',
                  fontWeight: 500,
                  fontSize: '0.65rem',
                }}
              >
                IA
              </Typography>
            </Box>
          </Tooltip>
        )}

        {isViewMode && (
          <Box
            className="px-3 py-1 rounded-full text-xs font-medium"
            sx={{
              backgroundColor: isDark ? 'rgba(99, 102, 241, 0.2)' : 'rgba(99, 102, 241, 0.1)',
              color: isDark ? '#818cf8' : '#6366f1',
            }}
          >
            Modo Vista
          </Box>
        )}
      </Box>

      <Tooltip title={isDark ? 'Modo Claro' : 'Modo Oscuro'} arrow>
        <IconButton
          size="small"
          onClick={() => setTheme(isDark ? 'light' : 'dark')}
          sx={{
            color: isDark ? 'grey.400' : 'grey.600',
            '&:hover': {
              backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
            },
          }}
        >
          {isDark ? <WeatherSunny24Regular /> : <WeatherMoon24Regular />}
        </IconButton>
      </Tooltip>

      <CustomModal
        open={saveModalOpen}
        onClose={() => setSaveModalOpen(false)}
        title="Guardar Diagrama"
        icon={<Save24Regular />}
        maxWidth={450}
      >
        <Box className="space-y-4">
          <Typography variant="body2" color={isDark ? 'grey.400' : 'grey.600'}>
            Tu diagrama se guarda automáticamente en el navegador. También puedes descargarlo como archivo JSON.
          </Typography>
          <Box className="flex gap-2" sx={{ mt: 2 }}>
            <Button
              fullWidth
              variant="outlined"
              onClick={() => setSaveModalOpen(false)}
              sx={{
                textTransform: 'none',
                borderColor: isDark ? '#334155' : '#e2e8f0',
                color: isDark ? 'grey.300' : 'grey.700',
              }}
            >
              Cancelar
            </Button>
            <Button
              fullWidth
              variant="contained"
              onClick={handleDownloadJson}
              sx={{
                textTransform: 'none',
                background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                color: "#FFF !important"
              }}
            >
              Descargar JSON
            </Button>
          </Box>
        </Box>
      </CustomModal>

      <CustomModal
        open={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        title="Importar Diagrama"
        icon={<ArrowUpload24Regular />}
        maxWidth={500}
      >
        <Box className="space-y-4">
          <Typography variant="body2" color={isDark ? 'grey.400' : 'grey.600'} mb={2}>
            Selecciona un archivo JSON o pega el contenido del diagrama.
          </Typography>

          <input
            type="file"
            accept=".json"
            ref={fileInputRef}
            onChange={handleFileSelect}
            className="hidden"
          />

          <Button
            fullWidth
            variant="outlined"
            onClick={() => fileInputRef.current?.click()}
            sx={{
              textTransform: 'none',
              borderColor: isDark ? '#334155' : '#e2e8f0',
              color: isDark ? 'grey.300' : 'grey.700',
              py: 1.5,
            }}
          >
            Seleccionar Archivo JSON
          </Button>

          <Divider sx={{ borderColor: isDark ? '#334155' : '#e2e8f0', mt: 2, mb: 2 }}>
            <Typography variant="caption" color={isDark ? 'grey.500' : 'grey.400'}>
              o pega el JSON
            </Typography>
          </Divider>

          <TextField
            fullWidth
            multiline
            rows={6}
            placeholder='{"nodes": [...], "connections": [...]}'
            value={importData}
            onChange={(e) => {
              setImportData(e.target.value)
              setImportError('')
            }}
            error={!!importError}
            helperText={importError}
            sx={{
              '& .MuiOutlinedInput-root': {
                backgroundColor: isDark ? '#0f172a' : '#f8fafc',
                '& fieldset': {
                  borderColor: isDark ? '#334155' : '#e2e8f0',
                },
              },
              '& .MuiInputBase-input': {
                fontFamily: 'monospace',
                fontSize: '0.75rem',
              },
            }}
          />

          <Box className="flex gap-2" sx={{ mt: 2 }}>
            <Button
              fullWidth
              variant="outlined"
              onClick={() => setImportModalOpen(false)}
              sx={{
                textTransform: 'none',
                borderColor: isDark ? '#334155' : '#e2e8f0',
                color: isDark ? 'grey.300' : 'grey.700',
              }}
            >
              Cancelar
            </Button>
            <Button
              fullWidth
              variant="contained"
              onClick={handleImportFromText}
              disabled={!importData.trim()}
              sx={{
                textTransform: 'none',
                background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                color: "#FFF !important"
              }}
            >
              Importar
            </Button>
          </Box>
        </Box>
      </CustomModal>

      <TraceTableModal
        open={traceTableModalOpen}
        onClose={() => setTraceTableModalOpen(false)}
      />
    </Paper>
  )
}
