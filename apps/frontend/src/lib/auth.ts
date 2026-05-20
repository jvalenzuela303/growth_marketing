import type { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import type { JwtPayload } from '@growth-engine/shared-types'

export const authOptions: NextAuthOptions = {
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/login',
    error:  '/login',
  },
  providers: [
    CredentialsProvider({
      name: 'Credenciales',
      credentials: {
        email:    { label: 'Email',      type: 'email'    },
        password: { label: 'Contraseña', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        try {
          const res = await fetch(
            `${process.env.API_URL ?? 'http://localhost:4001'}/api/v1/auth/login`,
            {
              method:  'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                email:    credentials.email,
                password: credentials.password,
              }),
            },
          )

          if (!res.ok) return null

          const data = await res.json()

          return {
            id:           data.userId,
            email:        data.email,
            name:         data.name,
            accessToken:  data.accessToken,
            refreshToken: data.refreshToken,
            tenantId:     data.tenantId,
            tenantSlug:   data.tenantSlug,
            tenantName:   data.tenantName,
            role:         data.role,
            plan:         data.plan,
          }
        } catch {
          return null
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.accessToken  = (user as any).accessToken
        token.refreshToken = (user as any).refreshToken
        token.tenantId     = (user as any).tenantId
        token.tenantSlug   = (user as any).tenantSlug
        token.tenantName   = (user as any).tenantName
        token.role         = (user as any).role
        token.plan         = (user as any).plan
      }
      return token
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken as string
      session.user = {
        ...session.user,
        id:         token.sub as string,
        tenantId:   token.tenantId as string,
        tenantSlug: token.tenantSlug as string,
        tenantName: token.tenantName as string,
        role:       token.role as JwtPayload['role'],
        plan:       token.plan as JwtPayload['plan'],
      } as any
      return session
    },
  },
}

// Extend next-auth types
declare module 'next-auth' {
  interface Session {
    accessToken: string
    user: {
      id: string
      email: string
      name?: string
      tenantId: string
      tenantSlug: string
      tenantName: string
      role: string
      plan: string
    }
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    accessToken?:  string
    refreshToken?: string
    tenantId?:     string
    tenantSlug?:   string
    tenantName?:   string
    role?:         string
    plan?:         string
  }
}
