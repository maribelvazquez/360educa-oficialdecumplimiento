# Herramientas del curso Oficial de Cumplimiento

**Clave del producto: OCU · Ruta sector financiero · GMC360 / 360Educa**

Seis herramientas listas y una en preparación. Sitio estático: no hay compilación,
ni gestor de paquetes, ni proceso de build. Se sube tal cual.

---

## 1 · Cómo se publica

1. Sube todo este contenido a un repositorio de GitHub, **conservando la raíz**
   (`index.html`, `netlify.toml`, `_headers` y `robots.txt` van en el nivel superior).
2. En Netlify: **Add new site → Import an existing project** y elige el repositorio.
   No configures comando de build. El directorio a publicar es `.` y ya está en `netlify.toml`.
3. En Thinkific, incrusta la liga del sitio en un iframe dentro de la lección
   correspondiente. El `netlify.toml` ya autoriza a `360educa.com` y a `*.thinkific.com`
   a mostrarlo en un marco, y bloquea a cualquier otro sitio.
4. Comprueba tres cosas: que el índice abre las cinco tarjetas, que desde cada herramienta
   la liga «← Todas las herramientas» regresa, y que el botón de PDF abre el diálogo
   de impresión.

Cada `git push` vuelve a publicar solo.

---

## 2 · Qué contiene

```
index.html          El aula: las cinco herramientas y las dos pendientes
estilo.css          Hoja compartida por todas. Aquí vive el diseño y TODO lo de impresión
datos/
  regimenes.js      Los catorce regímenes. Define la constante global DATA
diagnostico.html    5.1 · ¿Qué régimen me aplica?
calendario.html     5.2 · El calendario del cargo
brechas.html        5.3 · Dónde estás parado
actas.html          5.4 · Actas de dictamen
fuentes.html        5.7 · Doce fuentes
netlify/functions/
  analizar.mjs      Clasificador de operaciones (5.5 y 5.6) · inerte sin la llave
  salud.mjs         Dice si la función está lista, sin revelar la llave
CONTRATO.md         Reglas para quien escriba una herramienta nueva
netlify.toml        Cabeceras de seguridad y marco de Thinkific
_headers            Refuerzo de las mismas cabeceras
robots.txt          Fuera de buscadores
```

---

## 3 · De dónde salen los datos

`datos/regimenes.js` es la investigación normativa del curso: los catorce regímenes de
PLD/FT del sector financiero, extraídos del texto literal de las Disposiciones de
Carácter General, con la disposición citada en cada celda.

**Ninguna herramienta inventa nada.** Todas leen de ahí. Si una celda empieza con `—`,
significa que ese régimen NO contempla esa obligación, y así se pinta. Nunca se completa
el hueco de un sector con el dato de otro.

**Para actualizar un régimen** cuando salga una reforma: se corrige la celda en
`datos/regimenes.js` y las cinco herramientas quedan actualizadas de golpe. No hay que
tocar ningún HTML.

Compilados al día de hoy:

| Al día | Con fecha anterior |
|---|---|
| Bancos (ago 2024) · Transmisores, Centros cambiarios, AGD, Asesores, Uniones (2023) · SOFOM, SOFIPO, SOCAP, Casas de bolsa, Fondos (2021) | Casas de cambio (mar 2019) · Seguros (nov 2020) · Fintech (sep 2018) |

Los tres de la derecha son los últimos compilados publicados y van marcados con su fecha
dentro de cada ficha que emite la herramienta.

**Lo que falta**: ninguna de las catorce Disposiciones cita artículo sancionador ni montos.
Eso vive en la ley de cada ordenamiento y se incorpora aparte.

---

## 4 · La herramienta con inteligencia artificial

`clasificador.html` (5.5) llama a `netlify/functions/analizar.mjs`. **Sin la llave la
función responde 501 y la herramienta cae sola a un motor local por palabras clave**, se
lo dice al alumno en pantalla, y sigue entregando su PDF. Nunca se queda en blanco.

Un detalle de diseño que conviene conservar: **la inteligencia artificial NO propone
plazos ni números de disposición.** Las instrucciones del sistema se lo prohíben
expresamente, porque la obligación de reportar inusuales es la 37ª en bancos, la 29ª en
SOFOM y la 31ª en asesores: un solo número serviría para uno de los catorce y mentiría
para los otros trece. Los plazos y las citas los pone la página desde `datos/regimenes.js`
según el sector elegido. Si alguna vez editas el prompt, no quites esa regla.

**La llave nunca va en el repositorio.** Se pega directo de la Claude Console al campo de
Netlify, y de ningún otro lado: si estuviera en un archivo de GitHub, cualquiera la vería.
Ponle también fecha de caducidad larga al crearla, y apúntala: si vence, la función deja de
responder y la herramienta cae a su motor de reglas local sin avisar.

En Netlify → Site configuration → Environment variables:

| Variable | Valor | ¿Hace falta? |
|---|---|---|
| `ANTHROPIC_API_KEY` | La llave de la Claude Console | Sí |
| `ORIGENES_PERMITIDOS` | **La URL de este sitio en Netlify** | Sí |
| `AVISO_CORREO` | Tu correo, para el aviso al 80 % del tope | Recomendada |
| `TOPE_MENSUAL` | `3000` | No: ése es el valor por omisión |
| `CLAUDE_MODEL` | `claude-sonnet-5` | No: ése es el valor por omisión |
| `CODIGO_CURSO` | — | **No la uses.** Ver abajo |

Después de configurarlas, abre `/api/salud` y comprueba que `listo` sea `true`.

### Cuidado con `ORIGENES_PERMITIDOS`

Va la URL de **Netlify**, no la de Thinkific. Estar dentro de un marco de Thinkific no
cambia el origen de la página: se sirve desde Netlify y desde ahí le habla a su función.
Si pones la de Thinkific, la función rechaza todo y la herramienta se cae para todos.

### Por qué NO se usa `CODIGO_CURSO`

La función admite esa variable, pero **no la configures**. Para que sirviera, el código
tendría que ir escrito dentro de la página, y la página es HTML público que se le sirve a
cada alumno: cualquiera que abra el código fuente lo lee. No es un secreto, es un tope de
velocidad, y da una sensación de seguridad que no corresponde a lo que realmente protege.

Lo mismo, con honestidad, aplica a `ORIGENES_PERMITIDOS`: impide que **otro sitio web**
llame a la función desde su página, que es real y vale la pena, pero no detiene a alguien
con un script, porque ese encabezado se puede poner a mano fuera de un navegador.

**No hay forma de esconder un secreto dentro de algo que le entregas a cincuenta personas.**
Por eso lo que de verdad protege son otras dos cosas, y las dos son cuantitativas:

### Los candados y por qué están así

Calibrados para autoestudio de un mes, no para un taller de una hora:

- 4,000 caracteres de entrada y 2,000 tokens de salida. **Con 900 no alcanzaba**: el JSON
  se cortaba a media palabra, no se podía leer, y la herramienta caía al motor local sin
  que se viera por qué. Se paga lo que el modelo genera, no el techo.
- 40 análisis por dirección cada hora. Un alumno normal no lo toca.
- **Tope mensual global de 3,000 llamadas, con corte duro**, en la función.
- **Límite de gasto en la Claude Console** (`platform.claude.com/settings/billing` →
  «Set limit»): 20 dólares. Éste es el que más vale, porque lo aplica Anthropic y no
  depende de que mi código funcione bien.

Con esos dos, el peor escenario imaginable —que alguien encuentre la función y la ordeñe
todo el mes— cuesta veinte dólares. No hay nada más que valga la pena defender.

Con Sonnet 5 (2 dólares de entrada y 10 de salida por millón de tokens), y con una
respuesta real de unos mil tokens, cada análisis cuesta alrededor de **0.012 dólares**.
Con 50 alumnos a 40 análisis cada uno son unos **440 pesos** contra 245,000 de ingreso:
el 0.18 %. El tope de 3,000 acota el gasto máximo del mes a unos 36 dólares.

**No se usa Firebase.** En el taller de AMSOFIPO existe porque hay una facilitadora, un
copiloto y participantes viendo el mismo tablero al mismo tiempo. Aquí el curso es de
autoestudio: no hay dos personas en la misma pantalla, así que esa capa no compraría nada
y sí agregaría una dependencia que puede fallar. Lo único que se guarda es el sector
elegido, en el navegador del propio alumno.

---

## 5 · La regla del PDF

Cada herramienta entrega un PDF membretado con los datos del alumno. Se resuelve sin
librerías ni servidor: el bloque `@media print` de `estilo.css` esconde el cuestionario,
saca el membrete que sólo existe en el papel, y añade el cierre con la advertencia de
fechas de compilación y «material de capacitación, no asesoría legal». El botón abre el
diálogo del navegador y el alumno elige «Guardar como PDF».

Funciona sin conexión y no cuesta nada por uso.

---

## 6 · Verificación corrida sobre este paquete

- Las seis páginas cargan **sin un solo error de JavaScript**.
- **Cero desbordamiento horizontal** a 1280 px y en teléfono.
- Los campos condicionales aparecen y desaparecen bien en los catorce sectores:
  personas para once, nivel de operación para SOCAP, las tres condiciones para Uniones
  de Crédito, y ninguno para Asesores.
- En modo impresión, las cinco esconden la consola y el encabezado, y muestran el
  membrete y el cierre.
- `node --check` limpio en las cinco herramientas y en las dos funciones.
- Las actas se generaron para los 14 sectores × 4 tipos × ambos lados del umbral sin
  producir `undefined` ni citas de un régimen ajeno.
- El calendario corre los 14 sectores sin obligaciones inventadas.

---

## 7 · Si algo hay que arreglar

- **Un dato normativo mal**: se corrige en `datos/regimenes.js`, nunca en el HTML.
- **El color o la tipografía**: `estilo.css`, en los tokens de `:root`. La paleta es
  verde GMC `#64c27b` para la ruta del sector financiero, crema `#faf5ec` de fondo, y
  coral `#ff8361` **sólo** para acciones — nunca como color de sección.
- **Una herramienta nueva**: lee `CONTRATO.md` antes de escribir una línea.
