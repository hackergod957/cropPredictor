from pydantic import BaseModel, Field


class PredictRequest(BaseModel):
    lat: float = Field(..., ge=-90, le=90)
    lon: float = Field(..., ge=-180, le=180)

class CropScore(BaseModel):
    crop: str
    score: float

class PredictResponse(BaseModel):
    crops: list[CropScore]
    temperature: float
    humidity: float
    rainfall: float
    ph: float
    ph_is_default: bool
    elevation: float | None = None