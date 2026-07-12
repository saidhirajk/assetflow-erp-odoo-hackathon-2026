from fastapi import FastAPI

from app.modules.foundation.departments.routes import router as department_router

app=FastAPI(
    title="AssetFlow API",
    version="1.0.0"
)

app.include_router(department_router)