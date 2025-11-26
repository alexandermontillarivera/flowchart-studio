'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTheme } from 'next-themes'
import { Box, Typography, Tooltip, IconButton, TextField, InputAdornment } from '@mui/material'
import {
  ChevronLeft24Regular,
  ChevronRight24Regular,
  Search24Regular,
} from '@fluentui/react-icons'
import { ShapeRenderer } from '@/components/shapes/shape-renderer'
import { useFlowchartStore } from '@/modules/flowchart/hooks/use-flowchart-store'
import { ShapeType } from '@/interfaces/flowchart'

interface ShapeItem {
  type: ShapeType
  name: string
  category: string
}

const SHAPES: ShapeItem[] = [
  { type: 'start-end', name: 'Inicio/Fin', category: 'Básicas' },
  { type: 'process', name: 'Proceso', category: 'Básicas' },
  { type: 'decision', name: 'Decisión', category: 'Básicas' },
  { type: 'data', name: 'Datos', category: 'Básicas' },
  { type: 'document', name: 'Documento', category: 'Básicas' },
  { type: 'predefined-process', name: 'Proceso Predefinido', category: 'Básicas' },
  { type: 'connector', name: 'Conector', category: 'Básicas' },
  { type: 'delay', name: 'Retraso', category: 'Avanzadas' },
  { type: 'manual-input', name: 'Entrada Manual', category: 'Avanzadas' },
  { type: 'preparation', name: 'Preparación', category: 'Avanzadas' },
  { type: 'database', name: 'Base de Datos', category: 'Avanzadas' },
  { type: 'display', name: 'Pantalla', category: 'Avanzadas' },
  { type: 'manual-operation', name: 'Operación Manual', category: 'Avanzadas' },
  { type: 'loop-limit', name: 'Límite de Bucle', category: 'Avanzadas' },
  { type: 'merge', name: 'Unión', category: 'Símbolos' },
  { type: 'or', name: 'O', category: 'Símbolos' },
  { type: 'summing-junction', name: 'Suma', category: 'Símbolos' },
  { type: 'collate', name: 'Intercalar', category: 'Símbolos' },
  { type: 'sort', name: 'Ordenar', category: 'Símbolos' },
  { type: 'stored-data', name: 'Datos Almacenados', category: 'Almacenamiento' },
  { type: 'internal-storage', name: 'Almacenamiento Interno', category: 'Almacenamiento' },
]

const CATEGORIES = ['Básicas', 'Avanzadas', 'Símbolos', 'Almacenamiento']

export function ShapesSidebar() {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'

  const { isViewMode } = useFlowchartStore()

  const [isCollapsed, setIsCollapsed] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedCategories, setExpandedCategories] = useState<string[]>(CATEGORIES)

  if (isViewMode) {
    return null
  }

  const filteredShapes = SHAPES.filter((shape) =>
    shape.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleDragStart = (e: React.DragEvent, type: ShapeType) => {
    e.dataTransfer.setData('shape-type', type)
    e.dataTransfer.effectAllowed = 'copy'
  }

  const toggleCategory = (category: string) => {
    setExpandedCategories((prev) =>
      prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category]
    )
  }

  return (
    <motion.div
      className={`relative h-full flex flex-col ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'
        } border-r`}
      initial={false}
      animate={{ width: isCollapsed ? 56 : 280 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
    >
      <Box
        className="flex items-center justify-between p-3 border-b"
        sx={{
          borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
          padding: "12px 8px", marginBottom: isCollapsed ? 1 : 0
        }}
      >
        <AnimatePresence>
          {!isCollapsed && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
            >
              <Typography
                variant="subtitle1"
                fontWeight={600}
                color={isDark ? 'grey.100' : 'grey.900'}
              >
                Figuras
              </Typography>
            </motion.div>
          )}
        </AnimatePresence>

        <IconButton
          size="small"
          onClick={() => setIsCollapsed(!isCollapsed)}
          sx={{
            color: isDark ? 'grey.400' : 'grey.600',
            '&:hover': {
              backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
            },
          }}
        >
          {isCollapsed ? <ChevronRight24Regular /> : <ChevronLeft24Regular />}
        </IconButton>
      </Box>

      <AnimatePresence>
        {!isCollapsed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col flex-1 overflow-hidden"
          >
            <Box sx={{
              padding: "24px 8px"
            }}>
              <TextField
                size="small"
                placeholder="Buscar figuras..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                fullWidth
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search24Regular
                        style={{ color: isDark ? '#64748b' : '#94a3b8', fontSize: 18 }}
                      />
                    </InputAdornment>
                  ),
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
                    borderRadius: 2,
                    '& fieldset': {
                      borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                    },
                    '&:hover fieldset': {
                      borderColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)',
                    },
                  },
                  '& .MuiInputBase-input': {
                    color: isDark ? '#e2e8f0' : '#1e293b',
                    fontSize: '0.875rem',
                    '&::placeholder': {
                      color: isDark ? '#64748b' : '#94a3b8',
                      opacity: 1,
                    },
                  },
                }}
              />
            </Box>

            <Box className="flex-1 overflow-y-auto px-3 pb-3" sx={{
              padding: "0px 8px 24px 8px",
            }}>
              {CATEGORIES.map((category) => {
                const categoryShapes = filteredShapes.filter((s) => s.category === category)
                if (categoryShapes.length === 0) return null

                const isExpanded = expandedCategories.includes(category)

                return (
                  <Box key={category} sx={{
                    mb: 3
                  }}>
                    <button
                      onClick={() => toggleCategory(category)}
                      className={`w-full flex items-center gap-2 py-2 px-1 text-left rounded transition-colors ${isDark
                        ? 'text-slate-400 hover:text-slate-200'
                        : 'text-slate-600 hover:text-slate-900'
                        }`}
                    >
                      <motion.span
                        animate={{ rotate: isExpanded ? 90 : 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <ChevronRight24Regular style={{ fontSize: 16 }} />
                      </motion.span>
                      <Typography variant="caption" fontWeight={600} textTransform="uppercase">
                        {category}
                      </Typography>
                    </button>

                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <Box className="grid grid-cols-2 gap-2 mt-2">
                            {categoryShapes.map((shape) => (
                              <Tooltip key={shape.type} title={shape.name} placement="right" arrow>
                                <motion.div
                                  draggable
                                  onDragStart={(e) =>
                                    handleDragStart(e as unknown as React.DragEvent, shape.type)
                                  }
                                  className={`flex flex-col items-center justify-center p-3 rounded-lg cursor-grab transition-all ${isDark
                                    ? 'bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-600'
                                    : 'bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-slate-300'
                                    }`}
                                  whileHover={{ scale: 1.02 }}
                                  whileTap={{ scale: 0.98 }}
                                >
                                  <div className="w-12 h-12 flex items-center justify-center">
                                    <ShapeRenderer
                                      type={shape.type}
                                      width={shape.type === 'connector' ? 30 : 48}
                                      height={
                                        shape.type === 'decision'
                                          ? 48
                                          : shape.type === 'connector'
                                            ? 30
                                            : 32
                                      }
                                    />
                                  </div>
                                  <Typography
                                    variant="caption"
                                    className={`mt-1 text-center truncate w-full ${isDark ? 'text-slate-400' : 'text-slate-600'
                                      }`}
                                    sx={{ fontSize: '0.65rem' }}
                                  >
                                    {shape.name}
                                  </Typography>
                                </motion.div>
                              </Tooltip>
                            ))}
                          </Box>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </Box>
                )
              })}
            </Box>
          </motion.div>
        )}
      </AnimatePresence>

      {isCollapsed && (
        <Box className="flex flex-col items-center gap-2 py-3 overflow-y-auto">
          {SHAPES.slice(0, 8).map((shape) => (
            <Tooltip key={shape.type} title={shape.name} placement="right" arrow>
              <motion.div
                draggable
                onDragStart={(e) =>
                  handleDragStart(e as unknown as React.DragEvent, shape.type)
                }
                className={`w-10 h-10 flex items-center justify-center rounded-lg cursor-grab ${isDark
                  ? 'bg-slate-800 hover:bg-slate-700'
                  : 'bg-slate-100 hover:bg-slate-200'
                  }`}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
              >
                <ShapeRenderer
                  type={shape.type}
                  width={shape.type === 'connector' ? 20 : 28}
                  height={shape.type === 'decision' ? 28 : shape.type === 'connector' ? 20 : 20}
                />
              </motion.div>
            </Tooltip>
          ))}
        </Box>
      )}
    </motion.div>
  )
}
