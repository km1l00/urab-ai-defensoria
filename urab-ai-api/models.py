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
    # Tipo de petición (M2) — asesoria, solicitud, queja
    tipo_peticion       = Column(String, nullable=True)
    tipo_peticion_sugerido = Column(String, nullable=True)  # lo que M2 propuso originalmente
    override_tipo_justificacion = Column(Text, nullable=True)  # por qué el funcionario cambió
    derechos_vulnerados = Column(JSON, nullable=True)
    conducta_vulnera    = Column(Text, nullable=True)
    tipo_confirmado_hitl = Column(Boolean, default=False)
    # Gestiones sugeridas por M2 (lista de {accion, entidad, confirmada, respuesta, fecha_respuesta})
    gestiones           = Column(JSON, nullable=True)
    gestiones_confirmadas = Column(Boolean, default=False)
    # Recepción
    tipo_recepcion      = Column(String, nullable=True)   # ciudadano_directo, funcionario_asistida, funcionario_terreno
    procedimiento_recepcion = Column(Text, nullable=True)
    # Cierre
    caso_cerrado        = Column(Boolean, default=False)
    fecha_cierre        = Column(DateTime, nullable=True)
    # Complementos aportados por el ciudadano después de radicar
    complementos_ciudadano = Column(JSON, nullable=True)  # lista de {texto, archivos, fecha}
    # Observaciones del funcionario sobre el desempeño de la IA (auditoría del modelo)
    observaciones_ia    = Column(JSON, nullable=True)   # lista de {tipo_error, comentario, modulo, funcionario, fecha}
    # Observaciones del coordinador (supervisión de la gestión)
    observaciones_coord = Column(JSON, nullable=True)   # lista de {observacion, indice_gestion, coordinador, fecha}
    # Devolución del reparto por falta de competencia (funcionario -> coordinación)
    devuelto_a_coordinacion = Column(Boolean, default=False)
    devolucion_razon        = Column(Text, nullable=True)
    devolucion_funcionario  = Column(String, nullable=True)
    devolucion_fecha        = Column(DateTime, nullable=True)
    devolucion_resuelta     = Column(Boolean, default=False)

class Profesional(Base):
    __tablename__ = "profesionales"

    id              = Column(String, primary_key=True)
    nombre          = Column(String, nullable=False)
    correo          = Column(String, nullable=True)   # para alertas diarias
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
