'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTheme } from 'next-themes'
import {
  Box,
  Typography,
  TextField,
  IconButton,
  Divider,
  Slider,
  InputAdornment,
} from '@mui/material'
import { Dismiss24Regular, Delete24Regular } from '@fluentui/react-icons'
import { useFlowchartStore } from '@/modules/flowchart/hooks/use-flowchart-store'

const COLORS = [
  '#ef4444',
  '#f97316',
  '#eab308',
  '#22c55e',
  '#14b8a6',
  '#06b6d4',
  '#3b82f6',
  '#6366f1',
  '#8b5cf6',
  '#ec4899',
]

const SHAPE_NAMES: Record<string, string> = {
  'start-end': 'Inicio/Fin',
  process: 'Proceso',
  decision: 'Decisión',
  data: 'Datos',
  document: 'Documento',
  'predefined-process': 'Proceso Predefinido',
  connector: 'Conector',
  delay: 'Retraso',
  'manual-input': 'Entrada Manual',
  preparation: 'Preparación',
  database: 'Base de Datos',
  display: 'Pantalla',
  'manual-operation': 'Operación Manual',
  'loop-limit': 'Límite de Bucle',
  merge: 'Unión',
  or: 'O',
  'summing-junction': 'Suma',
  collate: 'Intercalar',
  sort: 'Ordenar',
  'stored-data': 'Datos Almacenados',
  'internal-storage': 'Almacenamiento Interno',
}

export function PropertiesPanel() {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'

  const { nodes, selectedNodeId, updateNode, deleteNode, selectNode } = useFlowchartStore()

  const selectedNode = nodes.find((n) => n.id === selectedNodeId)

  const [label, setLabel] = useState('')
  const [width, setWidth] = useState(160)
  const [height, setHeight] = useState(80)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (selectedNode) {
      setLabel(selectedNode.label)
      setWidth(selectedNode.size.width)
      setHeight(selectedNode.size.height)
    }
  }, [selectedNode])

  // Debounced label update
  const handleLabelChange = useCallback((value: string) => {
    setLabel(value)

    // Clear previous timeout
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    // Debounce the store update
    debounceRef.current = setTimeout(() => {
      if (selectedNodeId) {
        updateNode(selectedNodeId, { label: value })
      }
    }, 150)
  }, [selectedNodeId, updateNode])

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [])

  const handleSizeChange = (dimension: 'width' | 'height', value: number) => {
    if (dimension === 'width') {
      setWidth(value)
    } else {
      setHeight(value)
    }
    if (selectedNodeId) {
      updateNode(selectedNodeId, {
        size: {
          width: dimension === 'width' ? value : width,
          height: dimension === 'height' ? value : height,
        },
      })
    }
  }

  const handleColorChange = (color: string | undefined) => {
    if (selectedNodeId) {
      updateNode(selectedNodeId, { color })
    }
  }

  const handleDelete = () => {
    if (selectedNodeId) {
      deleteNode(selectedNodeId)
    }
  }

  const handleClose = () => {
    selectNode(null)
  }

  return (
    <AnimatePresence>
      {selectedNode && (
        <motion.div
          initial={{ x: 300, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 300, opacity: 0 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className={`absolute top-0 right-0 h-full w-72 border-l ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'
            } shadow-lg z-20`}
        >
          <Box
            className="flex items-center justify-between p-4 border-b"
            sx={{
              borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
              padding: "16px 24px"
            }}
          >
            <Typography
              variant="subtitle1"
              fontWeight={600}
              color={isDark ? 'grey.100' : 'grey.900'}
            >
              Propiedades
            </Typography>
            <Box className="flex items-center gap-1">
              <IconButton
                size="small"
                onClick={handleDelete}
                sx={{
                  color: 'error.main',
                  '&:hover': { backgroundColor: 'error.light', color: 'white' },
                }}
              >
                <Delete24Regular />
              </IconButton>
              <IconButton
                size="small"
                onClick={handleClose}
                sx={{
                  color: isDark ? 'grey.400' : 'grey.600',
                  '&:hover': {
                    backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
                  },
                }}
              >
                <Dismiss24Regular />
              </IconButton>
            </Box>
          </Box>

          <Box className="p-4 space-y-6 overflow-y-auto" sx={{ maxHeight: 'calc(100% - 64px)', padding: "24px" }}>
            <Box
              mb={1}
            >
              <Typography
                variant="caption"
                fontWeight={600}
                color={isDark ? 'grey.400' : 'grey.600'}
                className="uppercase mb-2 block"
              >
                Tipo de Figura
              </Typography>
              <Typography
                variant="body2"
                color={isDark ? 'grey.100' : 'grey.900'}
                className="capitalize"
              >
                {SHAPE_NAMES[selectedNode.type] || selectedNode.type}
              </Typography>
            </Box>

            <Divider sx={{ borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)', mb: 2 }} />

            <Box>
              <Typography
                variant="caption"
                fontWeight={600}
                color={isDark ? 'grey.400' : 'grey.600'}
                className="uppercase mb-2 block"
              >
                Etiqueta
              </Typography>
              <TextField
                size="small"
                fullWidth
                multiline
                rows={3}
                value={label}
                onChange={(e) => handleLabelChange(e.target.value)}
                placeholder="Escribe el texto..."
                sx={{
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
                    '& fieldset': {
                      borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                    },
                  },
                  '& .MuiInputBase-input': {
                    color: isDark ? '#e2e8f0' : '#1e293b',
                    fontSize: '0.875rem',
                  },
                }}
              />
            </Box>

            <Divider sx={{ borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)', mt: 2 }} />

            <Box
              mb={1}
              mt={2}
            >
              <Typography
                variant="caption"
                fontWeight={600}
                color={isDark ? 'grey.400' : 'grey.600'}
                className="uppercase mb-3 block"
              >
                Tamaño
              </Typography>
              <Box className="space-y-4">
                <Box>
                  <Typography
                    variant="caption"
                    color={isDark ? 'grey.500' : 'grey.500'}
                    className="mb-1 block"
                  >
                    Ancho: {Math.round(width)}px
                  </Typography>
                  <Slider
                    value={Math.min(width, 800)}
                    onChange={(_, v) => handleSizeChange('width', v as number)}
                    min={50}
                    max={800}
                    size="small"
                    sx={{ color: isDark ? '#818cf8' : '#6366f1' }}
                  />
                </Box>
                <Box>
                  <Typography
                    variant="caption"
                    color={isDark ? 'grey.500' : 'grey.500'}
                    className="mb-1 block"
                  >
                    Alto: {Math.round(height)}px
                  </Typography>
                  <Slider
                    value={Math.min(height, 600)}
                    onChange={(_, v) => handleSizeChange('height', v as number)}
                    min={30}
                    max={600}
                    size="small"
                    sx={{ color: isDark ? '#818cf8' : '#6366f1' }}
                  />
                </Box>
              </Box>
            </Box>

            <Divider sx={{ borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)', mb: 2 }} />

            <Box>
              <Typography
                variant="caption"
                fontWeight={600}
                color={isDark ? 'grey.400' : 'grey.600'}
                className="uppercase mb-3 block"
                mb={2}
              >
                Color
              </Typography>
              <Box className="flex flex-wrap gap-2">
                <motion.button
                  onClick={() => handleColorChange(undefined)}
                  className={`w-8 h-8 rounded-lg border-2 ${!selectedNode.color
                    ? isDark
                      ? 'border-indigo-400'
                      : 'border-indigo-500'
                    : isDark
                      ? 'border-slate-600'
                      : 'border-slate-300'
                    }`}
                  style={{
                    backgroundColor: isDark ? '#334155' : '#ffffff',
                  }}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                />
                {COLORS.map((color) => (
                  <motion.button
                    key={color}
                    onClick={() => handleColorChange(color)}
                    className={`w-8 h-8 rounded-lg border-2 ${selectedNode.color === color
                      ? isDark
                        ? 'border-white'
                        : 'border-slate-900'
                      : 'border-transparent'
                      }`}
                    style={{ backgroundColor: color }}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                  />
                ))}
              </Box>
            </Box>

            <Divider sx={{ borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)', mb: 2, mt: 2 }} />

            <Box>
              <Typography
                variant="caption"
                fontWeight={600}
                color={isDark ? 'grey.400' : 'grey.600'}
                className="uppercase mb-2 block"
              >
                Posición
              </Typography>
              <Box className="flex gap-2">
                <TextField
                  size="small"
                  type="number"
                  value={Math.round(selectedNode.position.x)}
                  onChange={(e) =>
                    updateNode(selectedNodeId!, {
                      position: { ...selectedNode.position, x: Number(e.target.value) },
                    })
                  }
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Typography variant="caption" color="grey.500">
                          X
                        </Typography>
                      </InputAdornment>
                    ),
                  }}
                  sx={{
                    flex: 1,
                    '& .MuiOutlinedInput-root': {
                      backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
                      '& fieldset': {
                        borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                      },
                    },
                    '& .MuiInputBase-input': {
                      color: isDark ? '#e2e8f0' : '#1e293b',
                      fontSize: '0.75rem',
                    },
                  }}
                />
                <TextField
                  size="small"
                  type="number"
                  value={Math.round(selectedNode.position.y)}
                  onChange={(e) =>
                    updateNode(selectedNodeId!, {
                      position: { ...selectedNode.position, y: Number(e.target.value) },
                    })
                  }
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Typography variant="caption" color="grey.500">
                          Y
                        </Typography>
                      </InputAdornment>
                    ),
                  }}
                  sx={{
                    flex: 1,
                    '& .MuiOutlinedInput-root': {
                      backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
                      '& fieldset': {
                        borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                      },
                    },
                    '& .MuiInputBase-input': {
                      color: isDark ? '#e2e8f0' : '#1e293b',
                      fontSize: '0.75rem',
                    },
                  }}
                />
              </Box>
            </Box>
          </Box>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
