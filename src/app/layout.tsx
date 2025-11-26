import { Metadata } from 'next'
import { inter } from '@/config/fonts'
import { ThemeProvider } from '@/shared/providers/theme-provider'
import { Toaster } from 'sonner'
import './globals.css'

export const metadata: Metadata = {
  title: 'FlowChart Studio',
  description: 'Editor moderno de diagramas de flujo con soporte de arrastrar y soltar',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/logo.png" />
      </head>
      <body className={`${inter.variable} antialiased`}>
        <ThemeProvider>{children}</ThemeProvider>
        <Toaster richColors position="top-right" />
      </body>
    </html>
  )
}
