"""FastAPI application entrypoint."""
from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
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

# Allowed origins come from CORS_ORIGINS env (dev default = the Vite dev server).
# Set this to your deployed frontend URL(s), comma-separated, in production.
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    # Also allow the production custom domain (+ www) and any Vercel deployment
    # URL for this project, regardless of the CORS_ORIGINS env value.
    allow_origin_regex=r"https://(www\.)?padharohomess\.xyz|https://[a-z0-9-]+\.vercel\.app",
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
