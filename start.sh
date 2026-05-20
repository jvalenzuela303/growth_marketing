#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_DIR="$ROOT_DIR/.logs"
mkdir -p "$LOG_DIR"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

log()  { echo -e "${GREEN}[start]${NC} $*"; }
info() { echo -e "${CYAN}[info]${NC}  $*"; }
warn() { echo -e "${YELLOW}[warn]${NC}  $*"; }

# ──────────────────────────────────────────────
# 1. Infraestructura Docker
# ──────────────────────────────────────────────
log "Levantando servicios Docker (postgres, redis, n8n, adminer)..."
cd "$ROOT_DIR/infra/docker"
docker compose up -d

log "Esperando a que postgres esté listo..."
until docker exec ge-postgres pg_isready -U postgres -d growth_engine -q 2>/dev/null; do
  sleep 1
done
log "Postgres listo."

log "Esperando a que redis esté listo..."
until docker exec ge-redis redis-cli ping 2>/dev/null | grep -q PONG; do
  sleep 1
done
log "Redis listo."

cd "$ROOT_DIR"

# ──────────────────────────────────────────────
# 2. AI Engine (FastAPI — Python)
# ──────────────────────────────────────────────
log "Iniciando AI Engine (FastAPI, puerto 8000)..."
cd "$ROOT_DIR/apps/ai-engine"
nohup uvicorn src.main:app --reload --port 8000 \
  > "$LOG_DIR/ai-engine.log" 2>&1 &
AI_ENGINE_PID=$!
echo "$AI_ENGINE_PID" > "$LOG_DIR/ai-engine.pid"
info "AI Engine PID: $AI_ENGINE_PID  →  logs: .logs/ai-engine.log"

cd "$ROOT_DIR"

# ──────────────────────────────────────────────
# 3. Backend NestJS (puerto 4001)
# ──────────────────────────────────────────────
log "Iniciando Backend NestJS (puerto 4001)..."
cd "$ROOT_DIR/apps/backend"
nohup pnpm dev \
  > "$LOG_DIR/backend.log" 2>&1 &
BACKEND_PID=$!
echo "$BACKEND_PID" > "$LOG_DIR/backend.pid"
info "Backend PID: $BACKEND_PID  →  logs: .logs/backend.log"

# ──────────────────────────────────────────────
# 4. Frontend Next.js (puerto 4000)
# ──────────────────────────────────────────────
log "Iniciando Frontend Next.js (puerto 4000)..."
cd "$ROOT_DIR/apps/frontend"
nohup pnpm dev \
  > "$LOG_DIR/frontend.log" 2>&1 &
FRONTEND_PID=$!
echo "$FRONTEND_PID" > "$LOG_DIR/frontend.pid"
info "Frontend PID: $FRONTEND_PID  →  logs: .logs/frontend.log"

cd "$ROOT_DIR"

# ──────────────────────────────────────────────
# 4. Resumen
# ──────────────────────────────────────────────
echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN} Growth Engine — sistema levantado${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "  Frontend      →  http://localhost:4000"
echo -e "  Backend       →  http://localhost:4001"
echo -e "  AI Engine     →  http://localhost:8000"
echo -e "  n8n           →  http://localhost:5678"
echo -e "  Adminer       →  http://localhost:8080"
echo -e "  Postgres      →  localhost:5433"
echo -e "  Redis         →  localhost:6380"
echo ""
echo -e "  Logs          →  $LOG_DIR/"
echo -e "  Para detener  →  ./stop.sh"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
