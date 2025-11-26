'use client'

import { createTheme, PaletteMode } from '@mui/material'
import { inter } from './fonts'

export const getDesignTokens = (mode: PaletteMode) => ({
  palette: {
    mode,
    ...(mode === 'light'
      ? {
          primary: { main: '#6366f1', light: '#818cf8', dark: '#4f46e5' },
          secondary: { main: '#ec4899', light: '#f472b6', dark: '#db2777' },
          background: {
            default: '#f8fafc',
            paper: '#ffffff',
          },
          text: {
            primary: '#1e293b',
            secondary: '#64748b',
          },
          divider: '#e2e8f0',
          action: {
            hover: 'rgba(99, 102, 241, 0.08)',
            selected: 'rgba(99, 102, 241, 0.14)',
          },
        }
      : {
          primary: { main: '#818cf8', light: '#a5b4fc', dark: '#6366f1' },
          secondary: { main: '#f472b6', light: '#f9a8d4', dark: '#ec4899' },
          background: {
            default: '#0f172a',
            paper: '#1e293b',
          },
          text: {
            primary: '#f1f5f9',
            secondary: '#94a3b8',
          },
          divider: '#334155',
          action: {
            hover: 'rgba(129, 140, 248, 0.12)',
            selected: 'rgba(129, 140, 248, 0.18)',
          },
        }),
  },
  typography: {
    fontFamily: inter.style.fontFamily,
    h1: { fontWeight: 700 },
    h2: { fontWeight: 600 },
    h3: { fontWeight: 600 },
    h4: { fontWeight: 600 },
    h5: { fontWeight: 500 },
    h6: { fontWeight: 500 },
    button: { textTransform: 'none' as const, fontWeight: 500 },
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          padding: '8px 16px',
          boxShadow: 'none',
          '&:hover': {
            boxShadow: 'none',
          },
        },
        contained: {
          '&:hover': {
            transform: 'translateY(-1px)',
            transition: 'transform 0.2s ease',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          borderRadius: 6,
          fontSize: '0.75rem',
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
        },
      },
    },
    MuiDivider: {
      styleOverrides: {
        root: {
          borderColor: mode === 'light' ? '#e2e8f0' : '#334155',
        },
      },
    },
  },
})

export const createAppTheme = (mode: PaletteMode) => createTheme(getDesignTokens(mode))
