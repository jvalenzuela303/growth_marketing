from fastapi import APIRouter

router = APIRouter(tags=["health"])


@router.get("/health")
def health_check() -> dict:
    """Endpoint de liveness/readiness para load balancers y orquestadores."""
    return {
        "status": "ok",
        "service": "ai-engine",
        "version": "1.0.0",
    }
