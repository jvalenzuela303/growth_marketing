FROM python:3.12-slim

# Metadatos del servicio
LABEL service="ai-engine" \
      project="the-growth-engine" \
      version="1.0.0"

WORKDIR /app

# Instala dependencias primero para aprovechar cache de capas de Docker
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copia el codigo fuente
COPY src/ ./src/

# Variables de entorno por defecto (sobreescribibles en docker-compose / k8s)
ENV AI_ENGINE_PORT=8000 \
    AI_ENGINE_ENV=production \
    LOG_LEVEL=info \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

EXPOSE 8000

# Uvicorn con workers = 1 por defecto; en produccion escalar con --workers o via k8s
CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
