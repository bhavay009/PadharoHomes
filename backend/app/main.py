"""FastAPI application entrypoint."""
from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.admin import router as admin_router
from app.api.auth import router as auth_router
from app.api.availability import router as availability_router
from app.api.health import router as health_router
from app.api.host_bookings import router as host_bookings_router
from app.api.profile import router as profile_router
from app.api.public import router as public_router
from app.api.reviews import router as reviews_router
from app.api.units import router as units_router

app = FastAPI(title="Padharo Homes API", version="0.1.0")

# Allow the Vite dev server to call the API during development.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router)
app.include_router(auth_router)
app.include_router(units_router)
app.include_router(availability_router)
app.include_router(public_router)
app.include_router(host_bookings_router)
app.include_router(reviews_router)
app.include_router(profile_router)
app.include_router(admin_router)
