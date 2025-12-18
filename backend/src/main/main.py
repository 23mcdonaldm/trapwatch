from fastapi import FastAPI
from api.v1.routes.events import router as events_router
from api.v1.routes.odds import router as odds_router

def create_app() -> FastAPI:
    app = FastAPI(title="TrapWatch Backend", version="0.1.0")

    # Versioned API prefix
    app.include_router(events_router, prefix="/api/v1")
    app.include_router(odds_router, prefix="/api/v1")
    # app.include_router(tasks_router, prefix="/api")

    @app.get("/")
    async def root():
        return {"message": "Hello, World!"}

    return app

app = create_app()
