"use client"
import { Box, Typography, Button } from '@mui/material'
import Image from 'next/image'
import Link from 'next/link'

export default function NotFoundPage() {
  return (
    <Box
      sx={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: (theme) =>
          theme.palette.mode === 'dark' ? '#0f172a' : '#f8fafc',
        padding: 2,
      }}
    >
      <Image
        src="/logo.png"
        alt="Error Illustration"
        width={130}
        height={130}
        style={{
          objectFit: 'contain',
        }}
      />
      <Typography variant="h4" sx={{ mt: 4, mb: 2 }}
        textAlign="center"
      >
        404 - Página No Encontrada
      </Typography>
      <Typography
        textAlign="center"
        variant="body1"
        sx={{ color: 'text.secondary' }}
      >
        Lo sentimos, la página que buscas no existe.
      </Typography>

      <Button
        component={Link}
        href="/"
        variant="contained"
        sx={{ mt: 4, color: "#FFF" }}
      >
        Volver al Inicio
      </Button>
    </Box>
  )
}