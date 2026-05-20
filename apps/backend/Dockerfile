# ── Stage 1: Build ──────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Instalar dependencias del sistema necesarias para bcrypt y prisma
RUN apk add --no-cache python3 make g++ openssl

# Copiar manifests primero para aprovechar caché de Docker
COPY package*.json ./
COPY prisma ./prisma/

# Instalar todas las dependencias (incluyendo devDeps para el build)
RUN npm ci

# Copiar el resto del código fuente
COPY . .

# Generar Prisma Client antes del build de NestJS
RUN npx prisma generate

# Build de producción
RUN npm run build

# ── Stage 2: Production ──────────────────────────────────────────────────────
FROM node:20-alpine AS production

WORKDIR /app

# Solo librerías de sistema necesarias en runtime
RUN apk add --no-cache openssl

# Usuario no-root para seguridad
RUN addgroup -g 1001 -S nodejs && adduser -S nestjs -u 1001

# Copiar artefactos del build
COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nestjs:nodejs /app/package.json ./package.json

USER nestjs

EXPOSE 3001

# Health check para Cloud Run / Kubernetes
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/api/v1/health || exit 1

CMD ["node", "dist/main"]
