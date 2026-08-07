# Protección de datos y registro de riesgos — URAB-AI

Documento de gobernanza del tratamiento de datos personales en el sistema
URAB-AI. Cubre el mapeo de la estrategia de mitigación en tres capas, el estado
real de cada control en esta versión, y el registro de riesgos conforme a la
cláusula 6.1 de ISO/IEC 42001. Marco normativo aplicable: Ley 1581 de 2012 y
Decreto 1377 de 2013 (Colombia), Reglamento UE 2016/679 (GDPR), Directiva
Conjunta 007 de 2025 y CONPES 4144 de 2025.

## 1. Estrategia de mitigación en tres capas

La transferencia de texto a la API del modelo de lenguaje (Anthropic) se protege
con tres capas independientes. Su independencia es deliberada: la falla o
ausencia de una no anula a las demás.

### Capa 1 — Mitigación contractual (DPA)

Data Processing Agreement enterprise con cláusulas de retención cero (zero data
retention), prohibición de uso de datos del cliente para reentrenamiento, y
compatibilidad con GDPR como argumento de nivel de protección equivalente ante
la SIC bajo el artículo 24 del Decreto 1377 de 2013.

**Estado en esta versión: pendiente.** El DPA no está suscrito. Mientras no
exista, el riesgo asociado a la retención y al uso de datos por el proveedor se
mantiene abierto y se registra en la sección 3 (riesgo R-01).

### Capa 2 — Cifrado en tránsito y en reposo

Cifrado AES-256 en reposo y TLS 1.3 en tránsito.

**Estado en esta versión: cubierto por la plataforma.**

- **En tránsito:** el backend se publica en Fly.io con `force_https` activo
  (ver `urab-ai-api/fly.toml`) y terminación TLS en el borde. Los tres portales
  se sirven por HTTPS desde Vercel. El tráfico hacia la API de Anthropic viaja
  sobre TLS.
- **En reposo:** la base de datos SQLite reside en un volumen persistente de
  Fly.io (`/data`), cifrado en reposo por la plataforma. No se almacenan datos
  personales en texto plano fuera de ese volumen.

### Capa 3 — Anonimización técnica previa al envío

Seudonimización de identificadores (cédula, nombre, dirección, teléfono, correo)
antes de que el texto llegue a la API.

**Estado en esta versión: implementado.**

- Módulo `urab-ai-api/anonimizacion.py`: reemplaza identificadores por
  marcadores estables (`[NOMBRE_1]`, `[CEDULA_1]`, `[TELEFONO_1]`,
  `[CORREO_1]`, `[DIRECCION_1]`) por dos vías, coincidencia exacta con los datos
  del expediente y detección por patrón sobre el texto libre. El número de
  radicado se preserva porque no es dato personal.
- Punto de choque único `urab-ai-api/ia.py` y función `llamar_claude` del
  orquestador: toda llamada al modelo seudonimiza el prompt antes de enviarlo y
  rehidrata la salida con los valores reales de forma transparente. El modelo
  nunca recibe el identificador real.
- Verificación de defensa en profundidad: `anonimizacion.contiene_pii` revisa
  que no quede un identificador detectable tras la seudonimización y lo deja en
  el registro de auditoría si lo hubiera.

## 2. Controles operativos

| Control | Estado | Evidencia |
|---------|--------|-----------|
| Seudonimización previa al envío | Implementado | `anonimizacion.py`, `ia.py`, `agentes/orquestador.py` |
| Punto único de tratamiento auditable | Implementado | `ia.py` |
| Cifrado en tránsito (TLS 1.3) | Plataforma | `fly.toml` (`force_https`), Vercel |
| Cifrado en reposo (AES-256) | Plataforma | Volumen persistente Fly.io |
| Control de acceso por roles (RBAC) | Implementado | `auth.py` (HMAC-SHA256) |
| Verificación de titularidad en consulta ciudadana | Implementado | `main.py` (`/api/peticiones/{radicado}`, `/api/seguimiento`) |
| DPA con retención cero | Pendiente | Requiere suscripción contractual |

## 3. Registro de riesgos (ISO/IEC 42001 §6.1)

Escala de impacto y probabilidad: Baja / Media / Alta. Revisión semestral a
cargo del Oficial de Protección de Datos (DPO) designado conforme a la Ley 1581
de 2012.

### R-01 — Retención o uso de datos por el proveedor sin DPA

- **Descripción:** sin DPA suscrito, no hay garantía contractual de retención
  cero ni de exclusión del reentrenamiento.
- **Impacto:** Alto. **Probabilidad:** Media.
- **Mitigación vigente:** la Capa 3 reduce el dato expuesto a marcadores; el
  contenido del relato viaja seudonimizado.
- **Plan:** suscribir el DPA enterprise con cláusulas de zero data retention.
  Hasta entonces el riesgo permanece abierto y aceptado por la dirección.

### R-02 — Nombres de terceros en el texto libre

- **Descripción:** la seudonimización por patrón no detecta nombres de personas
  distintas al titular registrado mencionadas dentro del relato, porque su
  detección requeriría reconocimiento de entidades que a su vez usa el modelo.
- **Impacto:** Medio. **Probabilidad:** Media.
- **Mitigación vigente:** se seudonimizan todos los identificadores del titular
  y los patrones de cédula, teléfono, correo y dirección presentes en el texto.
- **Plan:** evaluar una pasada de reconocimiento de entidades local (on-premise)
  previa al envío. Monitoreo semestral de casos de muestra.

### R-03 — Transcripción de documentos por Vision

- **Descripción:** la lectura de un documento aportado (imagen o PDF escaneado)
  transmite la imagen al modelo para su transcripción. La imagen contiene los
  datos en claro y no puede seudonimizarse antes de leerla.
- **Impacto:** Medio. **Probabilidad:** Media.
- **Mitigación vigente:** la función existe solo bajo acción explícita del
  ciudadano o del funcionario que sube el documento. La extracción de campos
  posterior sí se protege. Se registra la operación.
- **Plan:** cubrir bajo el DPA (R-01) y evaluar OCR on-premise para documentos
  con datos sensibles.

### R-04 — Clave de firma de sesión por defecto

- **Descripción:** `auth.py` usa una clave HMAC por defecto si no se define
  `URAB_AUTH_SECRET` en el entorno.
- **Impacto:** Alto. **Probabilidad:** Baja (en producción se define la variable).
- **Mitigación vigente:** la clave se lee del entorno; el valor por defecto es
  solo para demostración local.
- **Plan:** definir `URAB_AUTH_SECRET` como secreto en Fly.io antes de exponer
  el sistema a datos reales.

## 4. Gobernanza

- **DPO designado:** responsable del registro de riesgos y de la revisión
  semestral (pendiente de nombramiento formal por la entidad).
- **Frecuencia de revisión:** semestral, o ante cualquier cambio material en la
  arquitectura de tratamiento de datos.
- **Trazabilidad:** toda decisión automatizada queda sellada con versión de
  modelo, taxonomía y reglas (ver `main.py`), conforme al artículo 29 de la
  Constitución y la Directiva 007 de 2025.
