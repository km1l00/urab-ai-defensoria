"""
PDF de respuesta formal — backend URAB-AI
=========================================
Defensoría del Pueblo · URAB · LSL 2026

Genera una carta oficial en PDF con la respuesta de fondo al ciudadano, a partir
de la clasificación y las gestiones confirmadas y respondidas del caso. Incluye
el aviso de uso de inteligencia artificial dentro del texto (derecho del
peticionario, informe técnico §3.2) y el sello de procedencia.
"""

from io import BytesIO
from datetime import datetime, timezone, timedelta

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_JUSTIFY, TA_RIGHT, TA_CENTER
from reportlab.lib.colors import HexColor
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, HRFlowable, Table, TableStyle,
)

NAVY = HexColor("#1B3A5C")
GOLD = HexColor("#C79C00")
GRAY = HexColor("#555555")
TZ_CO = timezone(timedelta(hours=-5))

MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio",
         "agosto", "septiembre", "octubre", "noviembre", "diciembre"]


def _fecha_larga(dt):
    if not dt:
        dt = datetime.now(timezone.utc)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    d = dt.astimezone(TZ_CO)
    return f"{d.day} de {MESES[d.month - 1]} de {d.year}"


def _esc(texto):
    """Escapa caracteres que reportlab interpreta como marcado."""
    if texto is None:
        return ""
    return (str(texto).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;"))


def _encabezado_pie(canvas, doc):
    canvas.saveState()
    w, h = A4
    # Banda superior institucional
    canvas.setFillColor(NAVY)
    canvas.rect(0, h - 26 * mm, w, 26 * mm, fill=1, stroke=0)
    canvas.setFillColor(GOLD)
    canvas.rect(0, h - 27 * mm, w, 1 * mm, fill=1, stroke=0)
    canvas.setFillColor(HexColor("#FFFFFF"))
    canvas.setFont("Helvetica-Bold", 12)
    canvas.drawString(20 * mm, h - 13 * mm, "DEFENSORÍA DEL PUEBLO DE COLOMBIA")
    canvas.setFont("Helvetica", 7.5)
    canvas.setFillColor(HexColor("#C7D3E5"))
    canvas.drawString(20 * mm, h - 18 * mm, "Regional Urabá  ·  Sistema de Atención de Peticiones Ciudadanas (URAB-AI)")
    canvas.drawString(20 * mm, h - 22 * mm, "Ley 1755 de 2015  ·  Artículo 23 de la Constitución Política")
    # Pie
    canvas.setStrokeColor(HexColor("#C8D0DC"))
    canvas.setLineWidth(0.4)
    canvas.line(20 * mm, 15 * mm, w - 20 * mm, 15 * mm)
    canvas.setFillColor(GRAY)
    canvas.setFont("Helvetica-Oblique", 6.5)
    canvas.drawString(20 * mm, 11 * mm, "Documento generado por el Sistema de Gestión de Peticiones · Defensoría del Pueblo · Regional Urabá")
    canvas.setFont("Helvetica", 6.5)
    canvas.drawRightString(w - 20 * mm, 11 * mm, f"Página {doc.page}")
    canvas.restoreState()


def construir_pdf_respuesta(p) -> bytes:
    """Construye el PDF de respuesta formal desde un objeto Peticion (ORM)."""
    ss = getSampleStyleSheet()
    normal = ParagraphStyle("cuerpo", parent=ss["Normal"], fontName="Helvetica",
                            fontSize=10, leading=15, alignment=TA_JUSTIFY, spaceAfter=8)
    right = ParagraphStyle("der", parent=normal, alignment=TA_RIGHT, spaceAfter=4)
    label = ParagraphStyle("label", parent=normal, fontName="Helvetica-Bold",
                           textColor=NAVY, spaceAfter=2)
    seccion = ParagraphStyle("seccion", parent=normal, fontName="Helvetica-Bold",
                             textColor=NAVY, fontSize=10, spaceBefore=6, spaceAfter=4)
    aviso = ParagraphStyle("aviso", parent=normal, fontSize=8.5, textColor=GRAY,
                           leading=12, spaceBefore=6)

    radicado = _esc(getattr(p, "radicado", "") or "SIN-RADICADO")
    nombre = _esc(getattr(p, "ciudadano", "") or "Ciudadano/a")
    cedula = _esc(getattr(p, "cedula", "") or "")
    categoria = _esc(getattr(p, "categoria", "") or "")
    tipo = _esc(getattr(p, "tipo_peticion", None) or "petición ciudadana")
    fecha_rad = _fecha_larga(getattr(p, "fecha_radicado", None))
    profesional = _esc(getattr(p, "profesional_nombre", "") or "")
    relato = _esc((getattr(p, "texto_relato", "") or "").strip())
    pretension = relato[:240] + ("…" if len(relato) > 240 else "")

    story = []
    story.append(Spacer(1, 6 * mm))
    story.append(Paragraph(f"Apartadó, Antioquia, {_fecha_larga(None)}", right))
    story.append(Spacer(1, 4 * mm))

    story.append(Paragraph("SEÑOR / SEÑORA:", label))
    story.append(Paragraph(nombre, ParagraphStyle("dest", parent=normal, fontName="Helvetica-Bold", textColor=NAVY, spaceAfter=1)))
    if cedula:
        story.append(Paragraph(f"Cédula de ciudadanía No. {cedula}", ParagraphStyle("ced", parent=normal, spaceAfter=1)))
    story.append(Paragraph("Portal de Peticiones Ciudadanas — Defensoría del Pueblo", ParagraphStyle("it", parent=normal, fontName="Helvetica-Oblique", textColor=GRAY)))
    story.append(Spacer(1, 3 * mm))
    story.append(HRFlowable(width="100%", thickness=0.8, color=NAVY, spaceAfter=6))

    # Referencia
    ref = [
        [Paragraph("Radicado:", label), Paragraph(radicado, normal)],
        [Paragraph("Recibida el:", label), Paragraph(fecha_rad, normal)],
        [Paragraph("Asunto:", label), Paragraph(f"Respuesta a {tipo}" + (f" — {categoria}" if categoria else ""), normal)],
    ]
    t = Table(ref, colWidths=[28 * mm, None])
    t.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP"),
                           ("LEFTPADDING", (0, 0), (-1, -1), 0),
                           ("BOTTOMPADDING", (0, 0), (-1, -1), 2)]))
    story.append(t)
    story.append(Spacer(1, 4 * mm))

    # Saludo + contexto
    apellido = nombre.split(" ")
    saludo = f"señor(a) {apellido[1]}" if len(apellido) >= 2 else "ciudadano/a"
    story.append(Paragraph(f"Respetado(a) {saludo}:", label))
    story.append(Paragraph(
        f"En atención a la petición radicada bajo el número {radicado}, recibida el {fecha_rad}, "
        f"en la cual usted manifiesta: «{pretension}», la Defensoría del Pueblo — Regional Urabá "
        f"le informa las gestiones adelantadas en su caso:", normal))

    # Gestiones realizadas
    gestiones = getattr(p, "gestiones", None) or []
    confirmadas = [g for g in gestiones if g.get("confirmada")]
    if confirmadas:
        story.append(Paragraph("GESTIONES ADELANTADAS", seccion))
        for i, g in enumerate(confirmadas, 1):
            accion = _esc(g.get("accion", ""))
            entidad = _esc(g.get("entidad", ""))
            resp = _esc(g.get("respuesta", "")) or "En trámite ante la entidad competente."
            fecha_r = _esc(g.get("fecha_respuesta", ""))
            linea = f"<b>{i}. {accion}</b>"
            if entidad:
                linea += f" (ante {entidad})"
            linea += f". {resp}"
            if fecha_r:
                linea += f" <i>Respuesta recibida el {fecha_r}.</i>"
            story.append(Paragraph(linea, normal))
    else:
        story.append(Paragraph(
            "Su petición fue clasificada y asignada al profesional competente, quien adelanta "
            "las gestiones correspondientes. Puede consultar el avance en el portal ciudadano.", normal))

    # Cierre
    story.append(Spacer(1, 2 * mm))
    story.append(Paragraph(
        "De conformidad con lo anterior, la Defensoría del Pueblo — Regional Urabá reitera su "
        "compromiso con la garantía de sus derechos fundamentales y queda atenta a cualquier "
        "inquietud adicional relacionada con el trámite de la presente petición.", normal))

    # Aviso de IA (derecho del peticionario · §3.2)
    story.append(Paragraph(
        "Esta petición fue analizada con apoyo de un sistema de inteligencia artificial. La "
        "clasificación y las gestiones fueron revisadas y aprobadas por el profesional responsable, "
        "quien certifica de forma independiente el contenido de esta respuesta (Ley 734 de 2002 · "
        "Artículo 29 de la Constitución Política). Usted puede solicitar que una persona revise la "
        "clasificación asignada, sin necesidad de motivar técnicamente la solicitud.", aviso))

    # Firma
    story.append(Spacer(1, 12 * mm))
    story.append(Paragraph("Cordialmente,", normal))
    story.append(Spacer(1, 10 * mm))
    story.append(HRFlowable(width="55%", thickness=0.6, color=GRAY, hAlign="LEFT", spaceAfter=3))
    story.append(Paragraph("DEFENSORÍA DEL PUEBLO DE COLOMBIA", label))
    story.append(Paragraph("Regional Urabá — Sistema de Atención de Peticiones", ParagraphStyle("f2", parent=normal, spaceAfter=1)))
    if profesional:
        story.append(Paragraph(f"Profesional asignado(a): {profesional}", ParagraphStyle("f3", parent=normal, fontName="Helvetica-Oblique", textColor=GRAY)))

    buf = BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4,
                            leftMargin=20 * mm, rightMargin=20 * mm,
                            topMargin=32 * mm, bottomMargin=20 * mm,
                            title=f"Respuesta oficial - {radicado}",
                            author="Defensoría del Pueblo de Colombia")
    doc.build(story, onFirstPage=_encabezado_pie, onLaterPages=_encabezado_pie)
    return buf.getvalue()
