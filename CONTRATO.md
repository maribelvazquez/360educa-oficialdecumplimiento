# Contrato para quien escriba una herramienta de este repo

## Lo que ya existe y NO se toca
- `estilo.css` — hoja compartida por las cinco herramientas. Ya trae tokens de color,
  tipografía, la rejilla `.tablero`, `.consola`, `.ficha`, `.bloque`, `.reng`, `.cita`,
  `.veredicto`, `.exento`, tablas, `.membrete`, `.cierre` y TODO el bloque `@media print`.
  NO escribas CSS propio salvo lo que sea exclusivo de tu herramienta, y ponlo en un
  `<style>` al final del `<head>`.
- `datos/regimenes.js` — define la constante global `DATA`. Cárgalo con
  `<script src="datos/regimenes.js"></script>` ANTES de tu script.

## Forma de `DATA`
```
DATA.sectores      → [{clave, nombre, ley, compilado}]  (14, en orden)
DATA.gobierno[clave]    → {sector, designa, aviso_designacion, certificacion,
                           umbral_sin_comite, funcion_no_trasladada}
DATA.periodicos[clave]  → {sector, relevante_umbral, relevante_plazo,
                           dolares_efectivo, transferencias_int, otros}
DATA.deteccion[clave]   → {sector, inusual_plazo, desde_cuando,
                           veinticuatro_horas, internas_preocupantes}
DATA.anual[clave]       → {sector, capacitacion, auditoria, entrega_auditoria,
                           conservacion, ebr_actualizacion}
DATA.regla[clave]       → supuesto sin Comité:
      {t:'personas', n:25}                       11 sectores
      {t:'nivel'}                                SOCAP (sólo nivel I queda dispensado)
      {t:'triple', n:10, socios:500, udis:100}   UNIONES DE CRÉDITO (acumulativas)
      {t:'sincomite'}                            ASESORES (no existe Comité)
DATA.hallazgos / DATA.huecos → arreglos de frases
```
Toda celda de texto termina con su cita entre paréntesis: `"10 días hábiles (48ª fr. I)"`.
Una celda que empieza con `—` significa que ese régimen NO contempla esa obligación.

## Reglas de contenido, no negociables
1. **Nada inventado.** Todo dato normativo sale de `DATA`. Si no está ahí, no se escribe.
   Nunca completes el hueco de un sector con el dato de otro.
2. **La cita se conserva.** Separa texto y cita y píntala con `<span class="cita">`.
3. **«Personas a su servicio» es de la ENTIDAD**, no del área de cumplimiento, e incluye
   a quienes trabajan para ella indirectamente vía empresas de servicios complementarios.
4. **Cada herramienta entrega su PDF.** Botón `.accion` que llama `window.print()`, un
   `.membrete` que sólo aparece impreso (marca, título, datos del alumno, fecha) y un
   `.cierre` al final con la advertencia de fechas de compilación y
   «Material de capacitación, no asesoría legal».
5. **Abre en estado de trabajo**, con un sector ya elegido y valores plausibles: nunca
   una pantalla vacía esperando input.
6. Español de México, tono directo, sin adornos. Nunca emojis.

## Reglas técnicas
- Un solo archivo HTML por herramienta, en la raíz. Sin librerías, sin CDN, sin build.
- Empieza con `<!doctype html><html lang="es">` y enlaza
  `<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700&family=Inter:wght@400;500;600&display=swap">`
  y `<link rel="stylesheet" href="estilo.css">`.
- La página va dentro de un marco de Thinkific: incluye la barra `.regreso` arriba,
  con `<a href="index.html">← Todas las herramientas</a>`.
- `localStorage` sólo para comodidades del alumno (recordar su sector), siempre en try/catch.
- Escapa todo lo que pintes con innerHTML.
- Accesible: `label` real por control, foco visible, `prefers-reduced-motion` respetado.
