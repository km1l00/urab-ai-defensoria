"""
M1 — OCR Semántico (Fase 2)
Defensoría del Pueblo · URAB · LSL 2026

Extiende el Agente M1 con capacidad de extraer texto de:
  - PDFs (correspondencia física digitalizada)
  - Imágenes (fotos de documentos, formularios escaneados)

El texto extraído pasa directamente al pipeline NER de agente_m1.py.

Uso:
    from agentes.ocr_m1 import extraer_texto_documento
    texto = extraer_texto_documento("peticion.pdf")
    resultado_m1 = procesar_m1(texto, radicado)

Dependencias:
    pip install pymupdf pillow anthropic
    # Para OCR de imágenes con baja calidad:
    pip install pytesseract
    # + instalar Tesseract en el SO:
    # Ubuntu: sudo apt install tesseract-ocr tesseract-ocr-spa
    # Windows: https://github.com/UB-Mannheim/tesseract/wiki

Marco legal:
    §4.3 RFP: tratamiento de anexos (PDF, imágenes, escaneos) con controles de error
"""

import base64
import sys
from pathlib import Path
from typing import Optional

sys.path.insert(0, str(Path(__file__).parent.parent))
import anthropic
from config import ANTHROPIC_API_KEY, MODEL_DEFAULT

client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY or None)

# ── ESTRATEGIA DE EXTRACCIÓN ──────────────────────────────────────────────────
# 1. PDF con texto digital → pymupdf (rápido, sin API)
# 2. PDF escaneado / imagen → Claude Vision (semántico, entiende formularios)
# 3. Fallback → pytesseract (gratuito, requiere Tesseract instalado)

SYSTEM_OCR = """Eres un extractor de texto para la Defensoría del Pueblo de Colombia.
Recibes la imagen de una petición ciudadana (carta, formulario, carta manuscrita, o
documento escaneado). Tu tarea es transcribir el texto completo de forma fiel.

REGLAS:
- Transcribe TODO el texto visible, incluyendo fechas, números, nombres de entidades.
- Si hay campos de formulario (nombre, fecha, descripción del hecho), transcríbelos
  con el formato: "Campo: Valor".
- Si el texto es ilegible en alguna parte, escribe [ILEGIBLE].
- Si hay texto manuscrito, transcríbelo lo mejor posible y agrega [manuscrito].
- NO interpretes ni resumas — solo transcribe.
- NO incluyas descripción de la imagen ni comentarios sobre la calidad del documento."""


def _extraer_pdf_digital(ruta: Path) -> Optional[str]:
    """Extrae texto de PDF con texto digital (sin OCR)."""
    try:
        import fitz  # pymupdf
        doc = fitz.open(str(ruta))
        texto = ""
        for pagina in doc:
            texto += pagina.get_text()
        doc.close()
        return texto.strip() if texto.strip() else None
    except ImportError:
        return None
    except Exception as e:
        print(f"  [OCR] Error pymupdf: {e}")
        return None


def _extraer_con_vision(imagen_bytes: bytes, media_type: str = "image/jpeg") -> Optional[str]:
    """Usa Claude Vision para OCR semántico de imágenes y PDFs escaneados."""
    try:
        imagen_b64 = base64.standard_b64encode(imagen_bytes).decode("utf-8")
        respuesta = client.messages.create(
            model=MODEL_DEFAULT,
            max_tokens=2000,
            system=SYSTEM_OCR,
            messages=[{
                "role": "user",
                "content": [
                    {
                        "type": "image",
                        "source": {
                            "type": "base64",
                            "media_type": media_type,
                            "data": imagen_b64,
                        }
                    },
                    {
                        "type": "text",
                        "text": "Transcribe todo el texto de este documento."
                    }
                ]
            }]
        )
        return respuesta.content[0].text.strip()
    except Exception as e:
        print(f"  [OCR] Error Vision API: {e}")
        return None


def _extraer_con_tesseract(ruta: Path) -> Optional[str]:
    """Fallback: OCR con Tesseract (gratuito, requiere instalación local)."""
    try:
        import pytesseract
        from PIL import Image
        img = Image.open(str(ruta))
        texto = pytesseract.image_to_string(img, lang='spa')
        return texto.strip() if texto.strip() else None
    except ImportError:
        return None
    except Exception as e:
        print(f"  [OCR] Error Tesseract: {e}")
        return None


def _pdf_a_imagen(ruta: Path, pagina: int = 0) -> Optional[bytes]:
    """Convierte una página de PDF a imagen para pasar a Vision."""
    try:
        import fitz
        doc = fitz.open(str(ruta))
        if pagina >= len(doc):
            return None
        pag = doc[pagina]
        mat = fitz.Matrix(2.0, 2.0)  # 2x zoom para mejor OCR
        pix = pag.get_pixmap(matrix=mat)
        img_bytes = pix.tobytes("jpeg")
        doc.close()
        return img_bytes
    except ImportError:
        return None
    except Exception as e:
        print(f"  [OCR] Error convirtiendo PDF a imagen: {e}")
        return None


# ── FUNCIÓN PRINCIPAL ─────────────────────────────────────────────────────────
def extraer_texto_documento(
    ruta_archivo: str,
    usar_vision: bool = True,
    max_paginas: int = 3,
) -> dict:
    """
    Extrae texto de un documento para procesarlo con M1.

    Estrategia:
      1. Si es PDF con texto digital → pymupdf (rápido, sin API)
      2. Si el texto digital es vacío o escaso → OCR con Vision o Tesseract
      3. Para imágenes → Vision directamente

    Args:
        ruta_archivo:  Ruta al PDF o imagen (jpg, png, tiff).
        usar_vision:   Si True, usa Claude Vision para OCR semántico.
        max_paginas:   Máximo de páginas a procesar (para PDFs largos).

    Returns:
        dict con texto extraído, método usado, número de páginas y alertas.
    """
    ruta = Path(ruta_archivo)
    if not ruta.exists():
        return {"error": f"Archivo no encontrado: {ruta_archivo}", "texto": ""}

    extension = ruta.suffix.lower()
    texto_final = ""
    metodo = "sin_texto"
    alertas = []
    paginas_procesadas = 0

    # ── PDF ──────────────────────────────────────────────────────────────────
    if extension == ".pdf":
        # Intento 1: texto digital
        texto_digital = _extraer_pdf_digital(ruta)
        if texto_digital and len(texto_digital) > 50:
            texto_final = texto_digital
            metodo = "pdf_digital"
            paginas_procesadas = 1
        else:
            # Intento 2: PDF escaneado → convertir a imagen → Vision/Tesseract
            alertas.append("PDF sin texto digital — usando OCR")
            textos_paginas = []
            for num_pag in range(min(max_paginas, 10)):
                img_bytes = _pdf_a_imagen(ruta, num_pag)
                if img_bytes is None:
                    break
                if usar_vision:
                    texto_pag = _extraer_con_vision(img_bytes, "image/jpeg")
                    metodo = "vision_api"
                else:
                    # Guardar imagen temporal y usar tesseract
                    tmp = ruta.parent / f"_tmp_pag_{num_pag}.jpg"
                    tmp.write_bytes(img_bytes)
                    texto_pag = _extraer_con_tesseract(tmp)
                    tmp.unlink(missing_ok=True)
                    metodo = "tesseract"

                if texto_pag:
                    textos_paginas.append(texto_pag)
                    paginas_procesadas += 1
                else:
                    break

            texto_final = "\n\n---\n\n".join(textos_paginas)

    # ── IMAGEN ───────────────────────────────────────────────────────────────
    elif extension in {".jpg", ".jpeg", ".png", ".tiff", ".tif", ".bmp", ".webp"}:
        media_types = {
            ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
            ".png": "image/png",  ".tiff": "image/tiff",
            ".tif": "image/tiff", ".bmp": "image/jpeg",
            ".webp": "image/webp",
        }
        media_type = media_types.get(extension, "image/jpeg")

        if usar_vision:
            img_bytes = ruta.read_bytes()
            texto_final = _extraer_con_vision(img_bytes, media_type) or ""
            metodo = "vision_api"
        else:
            texto_final = _extraer_con_tesseract(ruta) or ""
            metodo = "tesseract"
        paginas_procesadas = 1

    else:
        alertas.append(f"Formato no soportado: {extension}")
        return {"error": f"Formato no soportado: {extension}", "texto": "", "alertas": alertas}

    # Control de calidad
    if len(texto_final) < 20:
        alertas.append("Texto extraído muy corto — posible error de OCR o documento en blanco")
    if "[ILEGIBLE]" in texto_final:
        alertas.append("Partes del documento son ilegibles — revisión manual recomendada")

    return {
        "ruta": str(ruta),
        "texto": texto_final,
        "metodo_ocr": metodo,
        "paginas_procesadas": paginas_procesadas,
        "longitud_chars": len(texto_final),
        "alertas": alertas,
        "listo_para_m1": len(texto_final) >= 20 and not alertas,
    }


# ── BATCH: procesar carpeta de documentos ────────────────────────────────────
def procesar_carpeta(
    carpeta: str,
    extensiones: set = {".pdf", ".jpg", ".jpeg", ".png"},
    usar_vision: bool = True,
) -> list[dict]:
    """
    Procesa todos los documentos de una carpeta.
    Útil para digitalizar correspondencia física en lote.
    """
    import time
    carpeta_path = Path(carpeta)
    if not carpeta_path.exists():
        return [{"error": f"Carpeta no encontrada: {carpeta}"}]

    archivos = [f for f in carpeta_path.iterdir() if f.suffix.lower() in extensiones]
    resultados = []

    print(f"[OCR M1] Procesando {len(archivos)} documentos en {carpeta}...")
    for i, archivo in enumerate(archivos, 1):
        print(f"  [{i}/{len(archivos)}] {archivo.name}")
        resultado = extraer_texto_documento(str(archivo), usar_vision=usar_vision)
        resultado["archivo"] = archivo.name
        resultados.append(resultado)
        if usar_vision:
            time.sleep(0.5)  # evitar rate limit

    exitosos = sum(1 for r in resultados if r.get("listo_para_m1"))
    print(f"[OCR M1] Completado: {exitosos}/{len(archivos)} documentos listos para M1")
    return resultados


# ── TEST RÁPIDO ───────────────────────────────────────────────────────────────
if __name__ == "__main__":
    import json

    print("=== TEST OCR M1 ===\n")
    print("Uso:")
    print("  from agentes.ocr_m1 import extraer_texto_documento")
    print("  resultado = extraer_texto_documento('mi_peticion.pdf')")
    print("  texto = resultado['texto']")
    print("  # Pasar texto a procesar_m1(texto, radicado)")
    print()
    print("Formatos soportados: PDF, JPG, PNG, TIFF")
    print("Métodos: pdf_digital (sin API) | vision_api (Claude) | tesseract (local)")
    print()
    print("Para procesar una carpeta de documentos:")
    print("  from agentes.ocr_m1 import procesar_carpeta")
    print("  resultados = procesar_carpeta('datos/correspondencia/')")
