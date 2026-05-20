import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import { Toaster } from 'sonner'
import './globals.css'
import { Providers } from '@/components/layout/Providers'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: {
    template: '%s | Growth Engine',
    default:  'Growth Engine — Plataforma de marketing con IA para LATAM',
  },
  description:
    'Convierte leads en clientes con IA. Scoring predictivo, automatizaciones multicanal y atribución real de ingresos.',
  keywords: [
    'embudo de ventas',
    'CRM con IA',
    'leads calificados',
    'marketing digital LATAM',
    'automatización WhatsApp',
  ],
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Growth Engine',
  },
  robots: { index: true, follow: true },
  openGraph: {
    type:   'website',
    locale: 'es_MX',
    siteName: 'Growth Engine',
  },
  icons: {
    icon: [
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/icons/icon-152x152.png', sizes: '152x152', type: 'image/png' },
    ],
  },
}

export const viewport: Viewport = {
  width:        'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor:   '#6366f1',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" className={inter.variable} suppressHydrationWarning>
      <head>
        {/* Preconnect to API origins for faster TTFB */}
        <link rel="preconnect" href="http://localhost:3001" />
        {/* Meta Pixel base script — loaded conditionally only on marketing routes */}
        {process.env.NEXT_PUBLIC_META_PIXEL_ID && (
          <script
            dangerouslySetInnerHTML={{
              __html: `
                !function(f,b,e,v,n,t,s){
                  if(f.fbq)return;n=f.fbq=function(){n.callMethod?
                  n.callMethod.apply(n,arguments):n.queue.push(arguments)};
                  if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
                  n.queue=[];t=b.createElement(e);t.async=!0;
                  t.src=v;s=b.getElementsByTagName(e)[0];
                  s.parentNode.insertBefore(t,s)}(window, document,'script',
                  'https://connect.facebook.net/en_US/fbevents.js');
                  fbq('init', '${process.env.NEXT_PUBLIC_META_PIXEL_ID}');
                  fbq('track', 'PageView');
              `,
            }}
          />
        )}
      </head>
      <body className="font-sans antialiased">
        <Providers>
          {children}
        </Providers>
        <Toaster
          position="bottom-center"
          richColors
          toastOptions={{
            classNames: {
              toast: 'font-sans text-base',
            },
          }}
        />
      </body>
    </html>
  )
}
