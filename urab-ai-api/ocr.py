"""
M1 · OCR con Claude Vision — backend URAB-AI (autónomo)
======================================================
Defensoría del Pueblo · URAB · LSL 2026

Extrae el texto de documentos aportados por el ciudadano o el funcionario
(imagen de una carta, formulario escaneado, PDF) y estructura los campos de la
petición para prellenar el formulario. La transcripción usa Claude Vision.

Estrategia:
  1. PDF con texto digital  → PyMuPDF (local, sin llamada al modelo).
  2. PDF escaneado / imagen → Claude Vision (transcripción semántica).
  3. Texto plano            → lectura directa.

Nota de tratamiento de datos: a diferencia de la lectura en el navegador, este
módulo transmite el documento a Claude Vision para su transcripción. Debe usarse
con el acuerdo de retención cero del proveedor y la anonimización aguas abajo que
ya aplica el resto del pipeline (ver informe técnico, §9.3 y Tabla 16).
"""

import os
import base64
import json

import anthropic

_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
_MODEL   = os.getenv("URAB_MODEL", "claude-haiku-4-5-20251001")
_client  = anthropic.Anthropic(api_key=_API_KEY or None)

MAX_BYTES = 20 * 1024 * 1024  # 20 MB

_MEDIA = {
    "jpg": "image/jpeg", "jpeg": "image/jpeg", "png": "image/png",
    "webp": "image/webp", "gif": "image/gif",
}

SYSTEM_OCR = """Eres un extractor de texto para la Defensoría del Pueblo de Colombia.
Recibes la imagen de una petición ciudadana (carta, formulario, carta manuscrita o
documento escaneado). Transcribe el texto completo de forma fiel.

REGLAS:
- Transcribe TODO el texto visible: fechas, números, nombres de entidades.
- Campos de formulario (nombre, fecha, hecho): transcríbelos como "Campo: Valor".
- Texto ilegible: escribe [ILEGIBLE]. Texto manuscrito: transcríbelo y marca [manuscrito].
- NO interpretes ni resumas. NO describas la imagen ni comentes su calidad."""


def _b64(data: bytes) -> str:
    return base64.standard_b64encode(data).decode("utf-8")


def _vision(image_bytes: bytes, media_type: str = "image/jpeg") -> str:
    resp = _client.messages.create(
        model=_MODEL,
        max_tokens=2000,
        system=SYSTEM_OCR,
        messages=[{
            "role": "user",
            "content": [
                {"type": "image", "source": {"type": "base64", "media_type": media_type, "data": _b64(image_bytes)}},
                {"type": "text", "text": "Transcribe todo el texto de este documento."},
            ],
        }],
    )
    return resp.content[0].text.strip()


def _pdf_texto_digital(data: bytes):
    try:
        import fitz  # PyMuPDF
        doc = fitz.open(stream=data, filetype="pdf")
        texto = "".join(pagina.get_text() for pagina in doc)
        doc.close()
        return texto.strip() or None
    except Exception:
        return None


def _pdf_pagina_a_imagen(data: bytes, pagina: int = 0):
    try:
        import fitz
        doc = fitz.open(stream=data, filetype="pdf")
        if pagina >= len(doc):
            doc.close()
            return None
        pix = doc[pagina].get_pixmap(matrix=fitz.Matrix(2.0, 2.0))  # 2x para mejor OCR
        img = pix.tobytes("jpeg")
        doc.close()
        return img
    except Exception:
        return None


def extraer_texto_documento(data: bytes, filename: str, max_paginas: int = 3) -> dict:
    """Extrae el texto de un documento (PDF/imagen/texto). Devuelve dict con
    texto, método usado y alertas. No lanza excepción por formato."""
    ext = (filename.rsplit(".", 1)[-1] if "." in filename else "").lower()
    alertas, metodo, texto = [], "sin_texto", ""

    if ext == "pdf":
        digital = _pdf_texto_digital(data)
        if digital and len(digital) > 50:
            texto, metodo = digital, "pdf_digital"
        else:
            alertas.append("PDF sin texto digital — transcripción con Claude Vision.")
            partes = []
            for i in range(max_paginas):
                img = _pdf_pagina_a_imagen(data, i)
                if img is None:
                    break
                t = _vision(img, "image/jpeg")
                if t:
                    partes.append(t)
                else:
                    break
            texto, metodo = "\n\n".join(partes), "vision_api"

    elif ext in _MEDIA:
        texto = _vision(data, _MEDIA[ext])
        metodo = "vision_api"

    elif ext in {"txt", "md"}:
        try:
            texto, metodo = data.decode("utf-8", errors="ignore"), "texto_directo"
        except Exception:
            texto = ""

    else:
        return {"ok": False, "error": f"Formato no soportado: .{ext or '?'}. Use PDF, imagen o texto.",
                "texto": "", "alertas": alertas}

    if len(texto) < 20:
        alertas.append("Texto extraído muy corto — posible documento en blanco o ilegible.")
    if "[ILEGIBLE]" in texto:
        alertas.append("Partes del documento son ilegibles — verificación manual recomendada.")

    return {"ok": True, "texto": texto, "metodo": metodo, "alertas": alertas, "longitud": len(texto)}


# ── Estructuración de campos para prellenar el formulario ─────────────────────
TOOL_CAMPOS = {
    "name": "extraer_campos_peticion",
    "description": "Extrae los campos de una petición ciudadana a partir del texto transcrito de un documento.",
    "input_schema": {
        "type": "object",
        "properties": {
            "nombre": {"type": ["string", "null"], "description": "Nombre y apellidos del peticionario, o null."},
            "cedula": {"type": ["string", "null"], "description": "Número de documento (solo dígitos), o null."},
            "tipo_peticion": {"type": ["string", "null"], "enum": ["Asesoría", "Queja", "Solicitud (mediación/conciliación)", None],
                              "description": "Tipo inferido de la petición."},
            "categoria": {"type": ["string", "null"], "description": "Temática: Salud, Pensiones, VBG, Carcelario, Desaparición, Educación, u otra."},
            "entidad_referida": {"type": ["string", "null"], "description": "Entidad responsable del problema (EPS, ICBF, INPEC, Fiscalía, etc.)."},
            "pretension": {"type": ["string", "null"], "description": "Qué pide el ciudadano, en una oración."},
            "indicador_urgencia": {"type": "boolean", "description": "true si el texto contiene señales de riesgo vital o urgencia."},
        },
        "required": ["nombre", "cedula", "tipo_peticion", "categoria", "entidad_referida", "pretension", "indicador_urgencia"],
    },
}


def extraer_campos(texto: str) -> dict:
    """Estructura los campos del formulario desde el texto transcrito, con
    tool_use (salida estructurada fiable). No inventa datos: usa null si el
    campo no aparece."""
    resp = _client.messages.create(
        model=_MODEL,
        max_tokens=800,
        system=("Extrae los campos de la petición del texto dado. Si un dato no aparece, "
                "usa null; nunca inventes. Llama a la herramienta extraer_campos_peticion."),
        tools=[TOOL_CAMPOS],
        tool_choice={"type": "tool", "name": "extraer_campos_peticion"},
        messages=[{"role": "user", "content": f"Texto del documento:\n\n{texto[:6000]}"}],
    )
    for bloque in resp.content:
        if bloque.type == "tool_use" and bloque.name == "extraer_campos_peticion":
            return dict(bloque.input)
    return {}
