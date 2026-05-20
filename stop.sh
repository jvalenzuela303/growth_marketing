#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_DIR="$ROOT_DIR/.logs"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log()  { echo -e "${RED}[stop]${NC}  $*"; }
ok()   { echo -e "${GREEN}[ok]${NC}    $*"; }
warn() { echo -e "${YELLOW}[warn]${NC}  $*"; }

kill_pid_file() {
  local label="$1"
  local pidfile="$2"

  if [[ -f "$pidfile" ]]; then
    local pid
    pid=$(cat "$pidfile")
    if kill -0 "$pid" 2>/dev/null; then
      log "Deteniendo $label (PID $pid)..."
      # Mata el proceso y todos sus hijos
      pkill -P "$pid" 2>/dev/null || true
      kill "$pid" 2>/dev/null || true
      # Espera hasta 5 s a que termine
      local i=0
      while kill -0 "$pid" 2>/dev/null && (( i < 10 )); do
        sleep 0.5
        (( i++ ))
      done
      if kill -0 "$pid" 2>/dev/null; then
        warn "$label no cerró limpiamente, enviando SIGKILL..."
        kill -9 "$pid" 2>/dev/null || true
      fi
      ok "$label detenido."
    else
      warn "$label (PID $pid) ya no estaba en ejecución."
    fi
    rm -f "$pidfile"
  else
    warn "No se encontró PID file para $label ($pidfile). ¿Ya estaba detenido?"
  fi
}

# ──────────────────────────────────────────────
# 1. Backend NestJS + Frontend Next.js
# ──────────────────────────────────────────────
kill_pid_file "Backend NestJS" "$LOG_DIR/backend.pid"
kill_pid_file "Frontend Next.js" "$LOG_DIR/frontend.pid"

# Por si quedaron procesos huérfanos de Node/Next/Nest
pkill -f "next dev" 2>/dev/null && ok "Proceso next dev terminado." || true
pkill -f "nest start" 2>/dev/null && ok "Proceso nest start terminado." || true

# ──────────────────────────────────────────────
# 2. AI Engine (FastAPI)
# ──────────────────────────────────────────────
kill_pid_file "AI Engine (uvicorn)" "$LOG_DIR/ai-engine.pid"

# Por si quedó algún uvicorn huérfano
pkill -f "uvicorn src.main:app" 2>/dev/null && ok "Proceso uvicorn terminado." || true

# ──────────────────────────────────────────────
# 3. Infraestructura Docker
# ──────────────────────────────────────────────
log "Deteniendo servicios Docker (postgres, redis, n8n, adminer)..."
cd "$ROOT_DIR/infra/docker"
docker compose down
ok "Servicios Docker detenidos."

cd "$ROOT_DIR"

# ──────────────────────────────────────────────
# Resumen
# ──────────────────────────────────────────────
echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN} Growth Engine — sistema detenido${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "  Para volver a levantar  →  ./start.sh"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
