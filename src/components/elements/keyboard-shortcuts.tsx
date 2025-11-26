'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTheme } from 'next-themes'
import { Paper, Typography, IconButton, Box, Chip } from '@mui/material'
import { Keyboard24Regular, Dismiss24Regular } from '@fluentui/react-icons'

const SHORTCUTS = [
  { keys: ['Ctrl/Cmd', 'C'], action: 'Copiar nodo seleccionado' },
  { keys: ['Ctrl/Cmd', 'V'], action: 'Pegar nodo' },
  { keys: ['Ctrl/Cmd', 'Z'], action: 'Deshacer' },
  { keys: ['Ctrl/Cmd', 'Y'], action: 'Rehacer' },
  { keys: ['Suprimir', 'Retroceso'], action: 'Eliminar elemento seleccionado' },
  { keys: ['Escape'], action: 'Limpiar selección / Cancelar conexión' },
  { keys: ['Alt', 'Arrastrar'], action: 'Mover canvas' },
  { keys: ['Botón Central'], action: 'Mover canvas' },
  { keys: ['Scroll'], action: 'Mover canvas' },
  { keys: ['Ctrl/Cmd', 'Scroll'], action: 'Acercar/Alejar' },
  { keys: ['Doble Clic'], action: 'Editar etiqueta del nodo' },
  { keys: ['Clic en Ancla'], action: 'Iniciar/Completar conexión' },
]

export function KeyboardShortcuts() {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <motion.div
        className="absolute bottom-4 left-4 z-10"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <IconButton
          onClick={() => setIsOpen(true)}
          sx={{
            backgroundColor: isDark ? 'rgba(30, 41, 59, 0.9)' : 'rgba(255, 255, 255, 0.9)',
            backdropFilter: 'blur(8px)',
            border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
            color: isDark ? 'grey.400' : 'grey.600',
            '&:hover': {
              backgroundColor: isDark ? 'rgba(51, 65, 85, 0.9)' : 'rgba(241, 245, 249, 0.9)',
            },
          }}
        >
          <Keyboard24Regular />
        </IconButton>
      </motion.div>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
            >
              <Paper
                elevation={24}
                sx={{
                  backgroundColor: isDark ? '#1e293b' : '#ffffff',
                  border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
                  borderRadius: 3,
                  overflow: 'hidden',
                  padding: "24px"
                }}
              >
                <Box
                  className="flex items-center justify-between p-4 border-b"
                  sx={{ borderColor: isDark ? '#334155' : '#e2e8f0', mb: 2, pb: 1 }}
                >
                  <Box className="flex items-center gap-2">
                    <Keyboard24Regular style={{ color: isDark ? '#818cf8' : '#6366f1' }} />
                    <Typography
                      variant="h6"
                      fontWeight={600}
                      color={isDark ? 'grey.100' : 'grey.900'}
                    >
                      Atajos de Teclado
                    </Typography>
                  </Box>
                  <IconButton
                    size="small"
                    onClick={() => setIsOpen(false)}
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

                <Box className="p-4 space-y-3 max-h-96 overflow-y-auto">
                  {SHORTCUTS.map((shortcut, index) => (
                    <Box key={index} className="flex items-center justify-between">
                      <Box className="flex items-center gap-1 flex-wrap" sx={{
                        mt: 1
                      }}>
                        {shortcut.keys.map((key, keyIndex) => (
                          <span key={keyIndex} className="flex items-center gap-1">
                            <Chip
                              label={key}
                              size="small"
                              sx={{
                                backgroundColor: isDark ? '#334155' : '#f1f5f9',
                                color: isDark ? '#e2e8f0' : '#475569',
                                fontWeight: 500,
                                fontSize: '0.75rem',
                                height: 26,
                                '& .MuiChip-label': {
                                  px: 1.5,
                                },
                              }}
                            />
                            {keyIndex < shortcut.keys.length - 1 && (
                              <Typography variant="caption" color={isDark ? 'grey.500' : 'grey.400'}>
                                +
                              </Typography>
                            )}
                          </span>
                        ))}
                      </Box>
                      <Typography
                        variant="body2"
                        color={isDark ? 'grey.400' : 'grey.600'}
                        className="text-right"
                      >
                        {shortcut.action}
                      </Typography>
                    </Box>
                  ))}
                </Box>

                <Box
                  className="p-4 border-t"
                  sx={{
                    borderColor: isDark ? '#334155' : '#e2e8f0',
                    backgroundColor: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.02)',
                    mt: 2,
                  }}
                >
                  <Typography
                    variant="caption"
                    color={isDark ? 'grey.500' : 'grey.500'}
                    className="text-center block"
                  >
                    Presiona <Chip label="Esc" size="small" sx={{ height: 20, fontSize: '0.65rem' }} />{' '}
                    para cerrar
                  </Typography>
                </Box>
              </Paper>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
