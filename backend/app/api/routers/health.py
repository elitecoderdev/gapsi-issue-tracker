from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(tags=["Health"])


class HealthResponse(BaseModel):
    status: str


@router.get("/health", response_model=HealthResponse, summary="Verifica que la API esté disponible")
async def health() -> HealthResponse:
    return HealthResponse(status="ok")
