from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models import Base, Peticion, Profesional, Evento
from seed_data import SEED_PETICIONES, SEED_PROFESIONALES, SEED_EVENTOS
import os

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./urab_ai.db")
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def init_db():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        # Solo sembrar si la tabla está vacía
        if db.query(Peticion).count() == 0:
            for p in SEED_PETICIONES:
                db.add(Peticion(**p))
        if db.query(Profesional).count() == 0:
            for p in SEED_PROFESIONALES:
                db.add(Profesional(**p))
        if db.query(Evento).count() == 0:
            for e in SEED_EVENTOS:
                db.add(Evento(**e))
        db.commit()
        print(f"DB inicializada — {db.query(Peticion).count()} peticiones, {db.query(Profesional).count()} profesionales")
    finally:
        db.close()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
