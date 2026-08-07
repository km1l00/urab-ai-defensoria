from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import sessionmaker
from models import Base, Peticion, Profesional, Evento
from seed_data import SEED_PETICIONES, SEED_PROFESIONALES, SEED_EVENTOS
import os

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./urab_ai.db")
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def _migrar_columnas():
    """Migración aditiva: agrega columnas nuevas del modelo que falten en una BD
    ya existente. `create_all` crea tablas nuevas pero no altera las existentes,
    y la BD SQLite de producción (volumen de Fly) sobrevive a los redeploys.
    Solo agrega columnas; nunca borra ni modifica datos."""
    inspector = inspect(engine)
    if "peticiones" not in inspector.get_table_names():
        return  # create_all la creará completa
    existentes = {c["name"] for c in inspector.get_columns("peticiones")}
    nuevas = {
        "borrador_m6":             "TEXT",
        "borrador_m6_hash":        "VARCHAR",
        "borrador_m6_fuentes":     "JSON",
        "borrador_m6_estado":      "VARCHAR",
        "borrador_m6_generado_en": "DATETIME",
        "historial_360":           "JSON",
    }
    faltantes = {c: t for c, t in nuevas.items() if c not in existentes}
    if not faltantes:
        return
    with engine.begin() as conn:
        for col, tipo in faltantes.items():
            conn.execute(text(f"ALTER TABLE peticiones ADD COLUMN {col} {tipo}"))
    print(f"DB migrada — columnas agregadas: {', '.join(faltantes)}")


def init_db():
    Base.metadata.create_all(bind=engine)
    _migrar_columnas()
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
