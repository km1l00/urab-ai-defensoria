"""URAB-AI · FastAPI main"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("URAB-AI API iniciando...")
    yield
    print("URAB-AI API cerrando...")

app = FastAPI(
    title="URAB-AI API",
    description="Orquestador agéntico Defensoría del Pueblo — LSL2026",
    version="0.1.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://urab-ciudadano.vercel.app",
        "https://urab-funcionario.vercel.app",
        "http://localhost:5173",
        "http://localhost:5174",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
async def health():
    return {"status": "ok", "sistema": "URAB-AI", "version": "0.1.0"}
