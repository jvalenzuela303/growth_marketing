import type { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import type { JwtPayload } from '@growth-engine/shared-types'

const API_URL = process.env.API_URL ?? 'http://localhost:4001'

async function refreshAccessToken(token: any) {
  try {
    const res = await fetch(`${API_URL}/api/v1/auth/refresh`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: token.sub, refreshToken: token.refreshToken }),
    })
    if (!res.ok) return { ...token, error: 'RefreshAccessTokenError' }
    const data = await res.json()
    return {
      ...token,
      accessToken:          data.accessToken,
      refreshToken:         data.refreshToken,
      accessTokenExpiresAt: Date.now() + data.expiresIn * 1000,
      error:                undefined,
    }
  } catch {
    return { ...token, error: 'RefreshAccessTokenError' }
  }
}

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
        token.accessToken          = (user as any).accessToken
        token.refreshToken         = (user as any).refreshToken
        token.accessTokenExpiresAt = Date.now() + 900 * 1000 // 15 min
        token.tenantId             = (user as any).tenantId
        token.tenantSlug           = (user as any).tenantSlug
        token.tenantName           = (user as any).tenantName
        token.role                 = (user as any).role
        token.plan                 = (user as any).plan
        return token
      }

      // Skip refresh only when we know the token is still fresh
      const expiresAt = (token as any).accessTokenExpiresAt as number | undefined
      if (expiresAt && Date.now() < expiresAt - 60_000) return token

      // Unknown expiry (pre-fix session) or within 60 s of expiry → refresh
      return refreshAccessToken(token)
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
    accessToken?:          string
    refreshToken?:         string
    accessTokenExpiresAt?: number
    tenantId?:             string
    tenantSlug?:           string
    tenantName?:           string
    role?:                 string
    plan?:                 string
    error?:                string
  }
}
