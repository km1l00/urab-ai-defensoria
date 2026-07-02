from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, Text, JSON
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime

Base = declarative_base()

class Peticion(Base):
    __tablename__ = "peticiones"

    radicado        = Column(String, primary_key=True, index=True)
    ciudadano       = Column(String, nullable=False)
    cedula          = Column(String, index=True)
    canal           = Column(String)          # web, correo, presencial, terreno
    fecha_radicado  = Column(DateTime, default=datetime.utcnow)
    urgencia        = Column(String)          # critica, alta, media, baja
    categoria       = Column(String)
    confianza_ia    = Column(Float)
    estado          = Column(String, default="Pendiente triage")
    profesional_id  = Column(String)
    profesional_nombre = Column(String)
    texto_relato    = Column(Text)
    entidades       = Column(JSON)            # lista de entidades referidas
    # Caracterización diferencial
    etario          = Column(String)
    etnia           = Column(String)
    discapacidad    = Column(String)
    victima_conflicto = Column(String)
    grupos_especiales = Column(JSON)
    # HITL
    requiere_hitl   = Column(Boolean, default=False)
    hitl_razon      = Column(Text)
    hitl_resuelto   = Column(Boolean, default=False)
    # Duplicidad
    es_duplicado    = Column(Boolean, default=False)
    duplicado_de    = Column(String, nullable=True)
    similitud_pct   = Column(Float, nullable=True)
    # Triage
    tiempo_triage_h = Column(Float, nullable=True)
    # Radicada por funcionario
    radicada_por_funcionario = Column(Boolean, default=False)
    funcionario_radicador    = Column(String, nullable=True)
    canal_origen_funcionario = Column(String, nullable=True)
    # Contacto
    contacto_tipo   = Column(String)          # correo, celular
    contacto_valor  = Column(String)
    # Términos legales
    fecha_vencimiento = Column(DateTime, nullable=True)
    # XAI
    explicacion_ia  = Column(Text)
    # Gestión del funcionario
    gestion_accion    = Column(Text, nullable=True)
    gestion_entidades = Column(JSON, nullable=True)
    gestion_plazo     = Column(String, nullable=True)
    gestion_fecha     = Column(DateTime, nullable=True)
    gestion_funcionario = Column(String, nullable=True)
    # Tipo de petición (M2) — asesoria, mediacion, queja
    tipo_peticion       = Column(String, nullable=True)
    derechos_vulnerados = Column(JSON, nullable=True)
    conducta_vulnera    = Column(Text, nullable=True)
    tipo_confirmado_hitl = Column(Boolean, default=False)

class Profesional(Base):
    __tablename__ = "profesionales"

    id              = Column(String, primary_key=True)
    nombre          = Column(String, nullable=False)
    color           = Column(String)
    especialidades  = Column(JSON)
    casos_activos   = Column(Integer, default=0)
    umbral_maximo   = Column(Integer, default=1200)
    hitl_pendientes = Column(Integer, default=0)
    terminos_riesgo = Column(Integer, default=0)

class Evento(Base):
    __tablename__ = "eventos"

    id              = Column(Integer, primary_key=True, autoincrement=True)
    radicado        = Column(String, index=True)
    titulo          = Column(String)
    fecha           = Column(DateTime, default=datetime.utcnow)
    actor           = Column(String)   # c=ciudadano, f=funcionario, ia=sistema
    actor_label     = Column(String)
    descripcion     = Column(Text)
