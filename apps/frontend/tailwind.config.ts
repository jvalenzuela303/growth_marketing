import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Brand palette — Growth Engine
        brand: {
          50:  '#fdf4ff',
          100: '#fae8ff',
          200: '#f3d0fe',
          300: '#e9a8fd',
          400: '#d873f8',
          500: '#c44df0',
          600: '#a730d6',
          700: '#8b24b0',
          800: '#731f8e',
          900: '#5e1b74',
          950: '#3e0650',
        },
        accent: {
          50:  '#fff7ed',
          100: '#ffedd5',
          200: '#fed7aa',
          300: '#fdba74',
          400: '#fb923c',
          500: '#f97316',
          600: '#ea580c',
          700: '#c2410c',
          800: '#9a3412',
          900: '#7c2d12',
          950: '#431407',
        },
        // Segment colors — semaphore system
        segment: {
          fuego:          { DEFAULT: '#10b981', light: '#d1fae5', text: '#065f46' },
          caliente:       { DEFAULT: '#3b82f6', light: '#dbeafe', text: '#1e3a8a' },
          tibio:          { DEFAULT: '#f59e0b', light: '#fef3c7', text: '#92400e' },
          frio:           { DEFAULT: '#64748b', light: '#f1f5f9', text: '#1e293b' },
          motor_detenido: { DEFAULT: '#6b7280', light: '#f3f4f6', text: '#111827' },
        },
        // Metric KPI colors
        kpi: {
          above:  '#10b981', // green — above target
          at:     '#f59e0b', // amber — at risk
          below:  '#ef4444', // red   — below target
        },
        // shadcn/ui CSS variable tokens
        border:      'hsl(var(--border))',
        input:       'hsl(var(--input))',
        ring:        'hsl(var(--ring))',
        background:  'hsl(var(--background))',
        foreground:  'hsl(var(--foreground))',
        primary: {
          DEFAULT:    'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT:    'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT:    'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT:    'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        popover: {
          DEFAULT:    'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT:    'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        // Neutral surface system
        surface: {
          base:    '#ffffff',
          subtle:  '#f8fafc',
          muted:   '#f1f5f9',
          overlay: '#e2e8f0',
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'Inter', 'system-ui', 'sans-serif'],
        display: ['var(--font-cal)', 'Inter', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        // Mobile-first scale — minimum 16px base to prevent iOS zoom
        'xs':   ['0.75rem',  { lineHeight: '1rem' }],
        'sm':   ['0.875rem', { lineHeight: '1.25rem' }],
        'base': ['1rem',     { lineHeight: '1.5rem' }],
        'lg':   ['1.125rem', { lineHeight: '1.75rem' }],
        'xl':   ['1.25rem',  { lineHeight: '1.75rem' }],
        '2xl':  ['1.5rem',   { lineHeight: '2rem' }],
        '3xl':  ['1.875rem', { lineHeight: '2.25rem' }],
        '4xl':  ['2.25rem',  { lineHeight: '2.5rem' }],
        '5xl':  ['3rem',     { lineHeight: '1.15' }],
        '6xl':  ['3.75rem',  { lineHeight: '1.1' }],
      },
      spacing: {
        // Touch targets — 56px is our standard (exceeds WCAG 44px minimum)
        'touch': '3.5rem',   // 56px
        'touch-sm': '2.75rem', // 44px minimum
      },
      borderRadius: {
        'xl':  '0.75rem',
        '2xl': '1rem',
        '3xl': '1.5rem',
        '4xl': '2rem',
      },
      boxShadow: {
        'card':       '0 1px 3px 0 rgb(0 0 0 / 0.07), 0 1px 2px -1px rgb(0 0 0 / 0.07)',
        'card-hover': '0 10px 25px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
        'quiz':       '0 4px 24px -4px rgb(196 77 240 / 0.2)',
        'quiz-hover': '0 8px 32px -4px rgb(196 77 240 / 0.35)',
        'cta':        '0 4px 20px -4px rgb(249 115 22 / 0.5)',
        'cta-hover':  '0 8px 28px -4px rgb(249 115 22 / 0.65)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bounce-sm':  'bounce-sm 1s infinite',
        'score-fill': 'score-fill 1.5s ease-out forwards',
        'fade-up':    'fade-up 0.5s ease-out forwards',
        'shimmer':    'shimmer 1.5s infinite linear',
      },
      keyframes: {
        'bounce-sm': {
          '0%, 100%': { transform: 'translateY(-4px)', animationTimingFunction: 'cubic-bezier(0.8,0,1,1)' },
          '50%':      { transform: 'translateY(0)',    animationTimingFunction: 'cubic-bezier(0,0,0.2,1)' },
        },
        'fade-up': {
          '0%':   { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'shimmer': {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      screens: {
        // Mobile-first — primary target: 390px (iPhone 14 Pro)
        'xs':  '390px',
        'sm':  '640px',
        'md':  '768px',
        'lg':  '1024px',
        'xl':  '1280px',
        '2xl': '1536px',
      },
      backgroundImage: {
        'gradient-brand':  'linear-gradient(135deg, #8b24b0 0%, #c44df0 50%, #f97316 100%)',
        'gradient-hero':   'linear-gradient(180deg, #1a0629 0%, #2d0a4a 50%, #1a0629 100%)',
        'gradient-cta':    'linear-gradient(135deg, #ea580c 0%, #f97316 100%)',
        'gradient-shimmer':'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%)',
      },
    },
  },
  plugins: [],
}

export default config
