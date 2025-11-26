'use client'

import { ThemeProvider as MuiThemeProvider } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import { ThemeProvider as NextThemeProvider, useTheme } from 'next-themes'
import { createAppTheme } from '@/config/theme'
import { ReactNode, useEffect, useState } from 'react'

interface ThemeProviderProps {
  children: ReactNode
}

function MuiThemeWrapper({ children }: ThemeProviderProps) {
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return null
  }

  const theme = createAppTheme(resolvedTheme === 'dark' ? 'dark' : 'light')

  return (
    <MuiThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </MuiThemeProvider>
  )
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  return (
    <NextThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <MuiThemeWrapper>{children}</MuiThemeWrapper>
    </NextThemeProvider>
  )
}
