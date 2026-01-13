from fastapi import FastAPI
from fastapi.responses import JSONResponse
from api.v1.routes.events import router as events_router
from api.v1.routes.odds import router as odds_router
from api.v1.routes.csv_odds import router as csv_odds_router
from api.v1.routes.traps import router as traps_router

def create_app() -> FastAPI:
    app = FastAPI(title="TrapWatch Backend", version="0.1.0")

    # Versioned API prefix
    app.include_router(events_router, prefix="/api/v1")
    app.include_router(odds_router, prefix="/api/v1")
    app.include_router(csv_odds_router, prefix="/api/v1")
    app.include_router(traps_router, prefix="/api/v1")
    # app.include_router(tasks_router, prefix="/api")

    @app.get("/")
    async def root():
        return {"message": "Hello, World!"}

    # Make Firestore credential/network failures surface as a clean 503 instead of a generic 500.
    try:
        from google.api_core.exceptions import GoogleAPIError, RetryError  # type: ignore
    except Exception:  # pragma: no cover
        GoogleAPIError = None  # type: ignore
        RetryError = None  # type: ignore

    if GoogleAPIError is not None:
        @app.exception_handler(GoogleAPIError)  # type: ignore[misc]
        async def _google_api_error_handler(_request, exc):  # type: ignore[no-redef]
            msg = str(exc)
            detail = (
                "Firestore call failed. If you're running locally, authenticate Application Default Credentials "
                "with `gcloud auth application-default login` or set `GOOGLE_APPLICATION_CREDENTIALS` to a service "
                "account JSON. "
                f"Original error: {msg}"
            )
            return JSONResponse(status_code=503, content={"detail": detail})

    if RetryError is not None:
        @app.exception_handler(RetryError)  # type: ignore[misc]
        async def _google_retry_error_handler(_request, exc):  # type: ignore[no-redef]
            msg = str(exc)
            detail = (
                "Firestore call timed out/unavailable. If you're running locally, authenticate Application Default "
                "Credentials with `gcloud auth application-default login` or set `GOOGLE_APPLICATION_CREDENTIALS` to "
                "a service account JSON. "
                f"Original error: {msg}"
            )
            return JSONResponse(status_code=503, content={"detail": detail})

    return app

app = create_app()
