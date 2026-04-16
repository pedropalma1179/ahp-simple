import type { Metadata, Viewport } from 'next'
import { Inter, Roboto_Mono } from 'next/font/google'
import './globals.css'
import './design-system.css'

// Fonte principal (UI/Interface)
const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
})

// Fonte monoespaçada (dados numéricos, matrizes, CR)
const robotoMono = Roboto_Mono({ 
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'AHP-BOCR | Avaliação de Investimentos I4.0',
  description: 'Sistema de apoio à decisão para investimentos em tecnologias da Indústria 4.0',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <body className={`${inter.variable} ${robotoMono.variable} ${inter.className}`}>
        {children}
      </body>
    </html>
  )
}
