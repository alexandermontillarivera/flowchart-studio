"use client"
import { Box, Typography } from '@mui/material'
import Image from 'next/image'

export default function ErrorPage() {
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
        Ups! Algo salió mal.
      </Typography>
      <Typography
        textAlign="center"
        variant="body1"
        sx={{ color: 'text.secondary' }}
      >
        Parece que la página que buscas no existe o ha ocurrido un error.
      </Typography>
    </Box>
  )
}