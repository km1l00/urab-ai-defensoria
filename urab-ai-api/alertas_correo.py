"""
Envío de alertas diarias por correo mediante Resend (https://resend.com).

Configuración por variables de entorno (no se guardan credenciales en el código):
  RESEND_API_KEY      -> API key de Resend (obligatoria para envío real)
  ALERTAS_FROM        -> remitente. Por defecto 'onboarding@resend.dev' (válido sin dominio)
  ALERTAS_DEMO_TO     -> si está definida, TODOS los correos se redirigen a esta dirección
                         (modo demo: la capa gratuita de Resend solo envía al correo de la cuenta)
  COORDINADOR_CORREO  -> correo del coordinador para el resumen global

Si RESEND_API_KEY no está definida, el sistema NO envía: devuelve los correos
que habría enviado (modo simulación), útil para desarrollo y para el pitch sin credenciales.
"""
import os
from datetime import datetime
from typing import Optional

try:
    import requests
except ImportError:
    requests = None

RESEND_API_KEY = os.environ.get("RESEND_API_KEY", "")
ALERTAS_FROM = os.environ.get("ALERTAS_FROM", "Alertas URAB <onboarding@resend.dev>")
ALERTAS_DEMO_TO = os.environ.get("ALERTAS_DEMO_TO", "")
COORDINADOR_CORREO = os.environ.get("COORDINADOR_CORREO", "coordinacion.urab@defensoria.gov.co")

DISCLAIMER = (
    "Este mensaje es una alerta operativa generada automáticamente por el sistema URAB-AI. "
    "El sistema prioriza y organiza la información, pero las decisiones sobre cada caso "
    "corresponden a la revisión humana del profesional responsable."
)


def _plantilla(nombre_dest, titulo, filas, es_coordinador=False):
    """Arma el HTML del correo. `filas` es una lista de dicts con titulo y desc."""
    hoy = datetime.utcnow().strftime("%d/%m/%Y")
    items = ""
    if not filas:
        items = ('<p style="color:#6B7280;font-size:14px;">No hay alertas pendientes para hoy. '
                 'Todos los casos están dentro de término.</p>')
    else:
        for f in filas:
            items += (
                '<div style="border-left:3px solid #1A3D6B;background:#F8FAFC;'
                'padding:10px 14px;margin-bottom:8px;border-radius:4px;">'
                f'<div style="font-weight:600;color:#1A3D6B;font-size:14px;">{f["titulo"]}</div>'
                f'<div style="color:#374151;font-size:13px;margin-top:2px;">{f["desc"]}</div>'
                '</div>'
            )
    ambito = "Panorama global de la Unidad" if es_coordinador else "Sus casos asignados"
    return f"""<!DOCTYPE html>
<html><body style="font-family:Arial,Helvetica,sans-serif;background:#F1F5F9;margin:0;padding:24px;">
  <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:10px;overflow:hidden;border:1px solid #E2E8F0;">
    <div style="background:#1A3D6B;padding:18px 22px;">
      <div style="color:#fff;font-size:18px;font-weight:700;">Defensoría del Pueblo · URAB</div>
      <div style="color:#BFDBFE;font-size:12px;margin-top:2px;">Alerta operativa diaria · {hoy}</div>
    </div>
    <div style="padding:22px;">
      <p style="font-size:15px;color:#111827;margin:0 0 4px;">Buenos días, {nombre_dest}.</p>
      <p style="font-size:13px;color:#6B7280;margin:0 0 16px;">{ambito} — {titulo}</p>
      {items}
    </div>
    <div style="background:#F8FAFC;border-top:1px solid #E2E8F0;padding:14px 22px;">
      <p style="font-size:11px;color:#94A3B8;line-height:1.5;margin:0;">{DISCLAIMER}</p>
    </div>
  </div>
</body></html>"""


def _enviar_uno(destinatario_real, asunto, html):
    """Envía un correo por Resend. Devuelve dict con el resultado."""
    if not RESEND_API_KEY or requests is None:
        # Modo simulación: no hay credenciales, se devuelve lo que se habría enviado
        return {"destinatario": destinatario_real, "asunto": asunto, "enviado": False, "modo": "simulado"}

    # En demo, redirigir todo al correo autorizado de la cuenta Resend
    destino = ALERTAS_DEMO_TO or destinatario_real
    try:
        r = requests.post(
            "https://api.resend.com/emails",
            headers={"Authorization": f"Bearer {RESEND_API_KEY}", "Content-Type": "application/json"},
            json={"from": ALERTAS_FROM, "to": [destino], "subject": asunto, "html": html},
            timeout=15,
        )
        ok = r.status_code in (200, 201)
        return {"destinatario": destinatario_real, "redirigido_a": destino if ALERTAS_DEMO_TO else None,
                "asunto": asunto, "enviado": ok, "status": r.status_code,
                "modo": "demo" if ALERTAS_DEMO_TO else "produccion"}
    except Exception as e:
        return {"destinatario": destinatario_real, "asunto": asunto, "enviado": False, "error": str(e)}


def enviar_alertas_diarias(db, Peticion, Profesional):
    """
    Construye y envía las alertas diarias:
      - cada profesional recibe SOLO sus casos (términos por vencer, HITL pendientes)
      - el coordinador recibe el panorama global
    Devuelve un resumen de lo enviado.
    """
    hoy = datetime.utcnow()
    resultados = []

    # ---- Correos por profesional (solo sus casos) ----
    profesionales = db.query(Profesional).all()
    for prof in profesionales:
        filas = []
        casos = db.query(Peticion).filter(
            Peticion.profesional_nombre == prof.nombre,
            Peticion.estado.notin_(["Cerrado", "Acumulado"])
        ).all()
        for p in casos:
            # Términos por vencer
            if p.fecha_vencimiento:
                dias = (p.fecha_vencimiento - hoy).days
                if dias <= 0:
                    filas.append({"titulo": f"{p.radicado} · {p.categoria} · VENCE HOY",
                                  "desc": f"{p.ciudadano} · Término legal de respuesta (CPACA, Art. 14)."})
                elif dias <= 3:
                    filas.append({"titulo": f"{p.radicado} · {p.categoria} · Vence en {dias} día(s)",
                                  "desc": f"{p.ciudadano} · Priorice la gestión."})
            # HITL / revisión humana pendiente
            if getattr(p, "requiere_hitl", False) and not getattr(p, "hitl_resuelto", False):
                filas.append({"titulo": f"{p.radicado} · Requiere revisión humana",
                              "desc": f"{p.ciudadano} · {p.categoria} · {p.hitl_razon or 'Revisión obligatoria del profesional.'}"})

        correo_dest = prof.correo or f"{prof.id.lower()}@defensoria.gov.co"
        html = _plantilla(prof.nombre, "Revisión humana y términos por vencer", filas)
        asunto = f"[URAB] Alerta diaria — {prof.nombre}" + (f" [demo]" if ALERTAS_DEMO_TO else "")
        resultados.append(_enviar_uno(correo_dest, asunto, html))

    # ---- Correo al coordinador (panorama global) ----
    filas_coord = []
    todos = db.query(Peticion).filter(Peticion.estado.notin_(["Cerrado", "Acumulado"])).all()
    vencen_hoy = [p for p in todos if p.fecha_vencimiento and (p.fecha_vencimiento - hoy).days <= 0]
    hitl_pend = [p for p in todos if getattr(p, "requiere_hitl", False) and not getattr(p, "hitl_resuelto", False)]
    if vencen_hoy:
        filas_coord.append({"titulo": f"{len(vencen_hoy)} caso(s) con término vencido o venciendo hoy",
                            "desc": "Requieren atención prioritaria de la Unidad."})
    if hitl_pend:
        filas_coord.append({"titulo": f"{len(hitl_pend)} caso(s) pendientes de revisión humana",
                            "desc": "Casos con revisión obligatoria del profesional aún sin resolver."})
    # Sobrecarga
    sobrecargados = db.query(Profesional).filter(
        Profesional.casos_activos > Profesional.umbral_maximo * 0.9
    ).all()
    for prof in sobrecargados:
        pct = round(prof.casos_activos / prof.umbral_maximo * 100)
        filas_coord.append({"titulo": f"{prof.nombre} ({prof.id}) al {pct}% de capacidad",
                            "desc": f"{prof.casos_activos}/{prof.umbral_maximo} casos. Considere redistribuir carga."})

    html_coord = _plantilla("Coordinación", "Resumen operativo de la Unidad", filas_coord, es_coordinador=True)
    asunto_coord = "[URAB] Resumen diario de coordinación" + (" [demo]" if ALERTAS_DEMO_TO else "")
    resultados.append(_enviar_uno(COORDINADOR_CORREO, asunto_coord, html_coord))

    enviados = sum(1 for r in resultados if r.get("enviado"))
    return {
        "ok": True,
        "fecha": hoy.strftime("%Y-%m-%d %H:%M UTC"),
        "total_destinatarios": len(resultados),
        "enviados": enviados,
        "modo": resultados[0].get("modo") if resultados else "sin_destinatarios",
        "detalle": resultados,
    }
