'use client'

import { ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTheme } from 'next-themes'
import { Box, Typography, IconButton } from '@mui/material'
import { Dismiss24Regular } from '@fluentui/react-icons'

interface CustomModalProps {
  open: boolean
  onClose: () => void
  title: string
  icon?: ReactNode
  children: ReactNode
  maxWidth?: number
}

export function CustomModal({
  open,
  onClose,
  title,
  icon,
  children,
  maxWidth = 400,
}: CustomModalProps) {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full px-4"
            style={{ maxWidth, maxHeight: '80vh' }}
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          >
            <Box
              sx={{
                backgroundColor: isDark ? '#1e293b' : '#ffffff',
                border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
                borderRadius: 3,
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                maxHeight: '80vh',
                boxShadow: isDark
                  ? '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
                  : '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              }}
            >
              <Box
                className="flex items-center justify-between border-b"
                sx={{
                  borderColor: isDark ? '#334155' : '#e2e8f0',
                  px: 3,
                  py: 2,
                  flexShrink: 0,
                }}
              >
                <Box className="flex items-center gap-3">
                  {icon && (
                    <Box sx={{ color: isDark ? '#818cf8' : '#6366f1' }}>{icon}</Box>
                  )}
                  <Typography
                    variant="h6"
                    fontWeight={600}
                    color={isDark ? 'grey.100' : 'grey.900'}
                  >
                    {title}
                  </Typography>
                </Box>
                <IconButton
                  size="small"
                  onClick={onClose}
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
              <Box
                sx={{
                  px: 3,
                  py: 2,
                  overflowY: 'auto',
                  flexGrow: 1,
                }}
              >
                {children}
              </Box>
            </Box>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
