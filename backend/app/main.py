from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

# Foundation routers
from app.modules.foundation.auth.routes import router as auth_router
from app.modules.foundation.departments.routes import router as department_router
from app.modules.foundation.categories.routes import router as category_router
from app.modules.foundation.users.routes import router as user_router

# Operation routers
from app.modules.operation.assets.routes import router as asset_router
from app.modules.operation.allocations.routes import router as allocation_router
from app.modules.operation.transfers.routes import router as transfer_router
from app.modules.operation.bookings.routes import router as booking_router
from app.modules.operation.maintenance.routes import router as maintenance_router
from app.modules.operation.notifications.routes import router as notification_router
from app.modules.operation.dashboard.routes import router as dashboard_router
from app.modules.operation.audits.routes import router as audit_router
from app.modules.operation.reports.routes import router as report_router

app = FastAPI(
    title="AssetFlow API",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(_: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=422,
        content={"success": False, "message": "Validation failed", "data": None, "errors": exc.errors()},
    )


@app.exception_handler(HTTPException)
async def http_exception_handler(_: Request, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"success": False, "message": str(exc.detail), "data": None},
    )


@app.get("/api/v1/health")
def health_check():
    return {"success": True, "message": "AssetFlow API is running", "data": None}


# Register all routers
app.include_router(auth_router)
app.include_router(department_router)
app.include_router(category_router)
app.include_router(user_router)
app.include_router(asset_router)
app.include_router(allocation_router)
app.include_router(transfer_router)
app.include_router(booking_router)
app.include_router(maintenance_router)
app.include_router(notification_router)
app.include_router(dashboard_router)
app.include_router(audit_router)
app.include_router(report_router)
