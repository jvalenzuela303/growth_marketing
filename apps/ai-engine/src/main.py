import logging
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import classify, health, scoring, predict

# Carga variables de entorno desde .env (no sobrescribe las del sistema)
load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("AI Engine starting up — The Growth Engine v1.0.0")
    yield
    logger.info("AI Engine shutting down.")


app = FastAPI(
    title="The Growth Engine — AI Service",
    description=(
        "Motor de inteligencia para scoring y clasificacion de leads. "
        "Formula: B(30) + Q(40) + E(20) + D(10) = 100 puntos."
    ),
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(scoring.router,  prefix="/score")
app.include_router(classify.router, prefix="/classify")
app.include_router(predict.router,  prefix="/predict")
