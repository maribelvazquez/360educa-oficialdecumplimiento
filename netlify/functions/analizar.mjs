/**
 * Clasificador de operaciones — Curso Oficial de Cumplimiento · GMC360 / 360Educa
 *
 * Recibe { texto, sector } y devuelve el análisis estructurado que pinta la herramienta:
 *   { clasificacion, plazo, tipologias:[], senales:[], parametro:{}, narrativa }
 *
 * ── Variables de entorno (Netlify → Site configuration → Environment variables)
 *   ANTHROPIC_API_KEY   obligatoria. Sin ella la función responde 501 y la herramienta
 *                       cae sola a su motor de reglas local, sin que el alumno lo note.
 *   CODIGO_CURSO        NO LA USES. Existe por compatibilidad, pero para que sirviera el
 *                       código tendría que ir escrito dentro de la página, que es HTML
 *                       público: cualquier alumno lo lee en el código fuente. No es un
 *                       secreto. Lo que de verdad protege es el tope mensual de aquí abajo
 *                       y el límite de gasto de la Claude Console.
 *   CLAUDE_MODEL        opcional. Por omisión claude-sonnet-5.
 *   TOPE_MENSUAL        opcional. Por omisión 3000 llamadas al mes (decisión del curso:
 *                       50 alumnos × 60 análisis). Al llegar al 80 % avisa en el log;
 *                       al llegar al tope corta en duro y responde 429.
 *   AVISO_CORREO        opcional. Correo al que se dirige el aviso de tope.
 *   ORIGENES_PERMITIDOS opcional. Lista separada por comas. Por omisión, el propio sitio.
 *
 * ── Candados de costo, calibrados para autoestudio y no para un taller de una hora
 *   · 4,000 caracteres de entrada como máximo.
 *   · max_tokens de 900: alcanza para el JSON con narrativa de seis renglones.
 *   · 25 segundos de tiempo límite.
 *   · 40 análisis por dirección cada hora. Un alumno normal usa tres o cuatro al día.
 *   · Tope mensual global: es el candado que de verdad importa. El límite por dirección
 *     no protege de una fuga de la liga; el tope global sí.
 *
 * Con Sonnet 5 a 2 dólares de entrada y 10 de salida por millón de tokens, cada análisis
 * cuesta alrededor de 0.009 dólares. El tope de 3,000 acota el gasto mensual a unos
 * 27 dólares aunque alguien ordeñe la función.
 */

const MODELO_POR_OMISION = 'claude-sonnet-5';
const RESPALDOS = ['claude-sonnet-5', 'claude-haiku-4-5'];

const MAX_CARACTERES = 4000;
const MIN_CARACTERES = 20;
const MAX_TOKENS = 900;
const TIMEOUT_MS = 25000;

const VENTANA_MS = 60 * 60 * 1000;     // una hora
const MAX_POR_VENTANA = 40;            // por dirección
const visitas = new Map();

// Contador mensual, best-effort dentro de la instancia. Netlify puede levantar varias,
// así que el tope real es aproximado; sirve como freno, no como contabilidad.
let mes = new Date().getUTCMonth();
let llamadasDelMes = 0;
let avisado = false;

const INSTRUCCIONES = `Eres analista de prevención de lavado de dinero y financiamiento al terrorismo
especializado en el SECTOR FINANCIERO de México, apoyando la formación de oficiales de cumplimiento
de nueva designación en el curso de 360Educa.

Recibirás la descripción de un comportamiento observado, redactada por un oficial de cumplimiento,
y el tipo de entidad en que trabaja. Analízala y responde ÚNICAMENTE con un objeto JSON válido,
sin texto antes ni después, con esta forma:

{
  "clasificacion": "No reportable · seguimiento documentado" | "Operación inusual" | "Operación inusual con elementos de preocupante" | "Operación interna preocupante",
  "plazo": "una frase con el plazo o la acción que corresponde",
  "tipologias": [{"nombre": "nombre de la tipología", "peso": 1-10}],
  "senales": [{"texto": "señal de alerta observable", "peso": 1-5}],
  "parametro": {"variable": "qué se mide", "umbral": "valor o condición", "ventana": "periodo de observación"},
  "narrativa": "borrador de narrativa para el reporte: qué se observó, cómo se detectó, qué verificó la institución y por qué se clasifica así. Cuatro a seis renglones."
}

Reglas:
- Las señales deben ser OBSERVABLES, no interpretaciones ni juicios sobre la persona.
- En "parametro" propón cómo parametrizarías el alertamiento en un sistema de monitoreo:
  qué variable, con qué umbral y en qué ventana de tiempo. Si no aplica, devuélvelo en null.
- Una operación interna preocupante es la que involucra a un directivo, funcionario, empleado
  o apoderado de la propia entidad. No la confundas con la inusual del cliente.
- NO cites números de disposición ni de artículo: cambian de un régimen a otro y la
  herramienta los pone por su cuenta a partir del sector. Habla de obligaciones, no de artículos.
- No inventes cifras, plazos ni fechas. Si el texto no las trae, no las supongas.
- Esto es material de análisis y capacitación, no asesoría legal para un caso concreto.
- Si el comportamiento no encaja en ninguna tipología conocida del sector, devuelve "tipologias": [].`;

const json = (codigo, cuerpo, origen) => new Response(JSON.stringify(cuerpo), {
  status: codigo,
  headers: {
    'content-type': 'application/json; charset=utf-8',
    'access-control-allow-origin': origen || '*',
    'access-control-allow-headers': 'content-type, x-curso',
    'access-control-allow-methods': 'POST, OPTIONS',
    'cache-control': 'no-store',
  },
});

function limitePorDireccion(ip) {
  const ahora = Date.now();
  const previas = (visitas.get(ip) || []).filter(t => ahora - t < VENTANA_MS);
  if (previas.length >= MAX_POR_VENTANA) return false;
  previas.push(ahora);
  visitas.set(ip, previas);
  if (visitas.size > 5000) visitas.clear();   // higiene de memoria
  return true;
}

function topeMensual(tope) {
  const ahoraMes = new Date().getUTCMonth();
  if (ahoraMes !== mes) { mes = ahoraMes; llamadasDelMes = 0; avisado = false; }
  if (llamadasDelMes >= tope) return false;
  llamadasDelMes++;
  if (!avisado && llamadasDelMes >= Math.floor(tope * 0.8)) {
    avisado = true;
    console.warn(`[OCU] Aviso de tope: ${llamadasDelMes} de ${tope} llamadas del mes. ` +
      `Avisar a ${process.env.AVISO_CORREO || 'el responsable del curso'}.`);
  }
  return true;
}

export default async (peticion) => manejar(peticion);

async function manejar(peticion) {
  const origen = peticion.headers.get('origin') || '';
  if (peticion.method === 'OPTIONS')
    return json(200, { ok: true }, origen);   // 204 no admite cuerpo: usar 200

  // Autoprueba desde la barra de direcciones: /api/analizar (sin POST).
  // Corre exactamente el mismo camino que usa la herramienta, con un texto fijo,
  // y devuelve lo que salga. Sirve para ver el error sin abrir la consola.
  if (peticion.method === 'GET') {
    const u = new URL(peticion.url);
    if (u.searchParams.get('probar') !== '0') {
      const falso = new Request(u.origin + '/api/analizar', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          texto: 'Un cliente recibió catorce depósitos en efectivo de entre siete y nueve mil pesos en once días, en cinco sucursales distintas. Su perfil declarado es de veinte mil pesos al mes.',
          sector: 'Instituciones de crédito',
        }),
      });
      const r = await manejar(falso);
      const cuerpo = await r.clone().text();
      return json(200, {
        autoprueba: true,
        estado_de_la_funcion: r.status,
        respuesta: (() => { try { return JSON.parse(cuerpo); } catch { return cuerpo.slice(0, 600); } })(),
        interpretacion: r.status === 200
          ? 'La función responde bien. Si la herramienta sigue cayendo al respaldo, el problema está en el navegador.'
          : 'Aquí está el error que hace caer la herramienta al motor local.',
      }, origen);
    }
    return json(405, { error: 'Sólo POST' }, origen);
  }
  if (peticion.method !== 'POST') return json(405, { error: 'Sólo POST' }, origen);

  // .trim() a propósito: un espacio o salto de línea pegado por accidente
  // produce un 401 «invalid x-api-key» imposible de ver a simple vista.
  const clave = (process.env.ANTHROPIC_API_KEY || "").trim();
  if (!clave) return json(501, { error: 'sin_configurar' }, origen);

  const codigo = process.env.CODIGO_CURSO;
  if (codigo && peticion.headers.get('x-curso') !== codigo)
    return json(403, { error: 'codigo_invalido' }, origen);

  const permitidos = (process.env.ORIGENES_PERMITIDOS || '').split(',').map(s => s.trim()).filter(Boolean);
  if (permitidos.length && origen && !permitidos.includes(origen))
    return json(403, { error: 'origen_no_permitido' }, origen);

  const ip = peticion.headers.get('x-nf-client-connection-ip')
          || peticion.headers.get('x-forwarded-for') || 'desconocida';
  if (!limitePorDireccion(ip))
    return json(429, { error: 'demasiadas_peticiones', mensaje: 'Espera unos minutos antes de analizar otra operación.' }, origen);

  const tope = Number(process.env.TOPE_MENSUAL || 3000);
  if (!topeMensual(tope))
    return json(429, { error: 'tope_mensual', mensaje: 'El curso alcanzó su tope de análisis del mes. Avisa a 360Educa.' }, origen);

  let cuerpo;
  try { cuerpo = await peticion.json(); } catch { return json(400, { error: 'json_invalido' }, origen); }

  const texto = String(cuerpo?.texto || '').trim();
  const sector = String(cuerpo?.sector || '').slice(0, 60);
  if (texto.length < MIN_CARACTERES) return json(400, { error: 'texto_corto' }, origen);
  if (texto.length > MAX_CARACTERES) return json(400, { error: 'texto_largo', maximo: MAX_CARACTERES }, origen);

  const modelos = [process.env.CLAUDE_MODEL || MODELO_POR_OMISION,
                   ...RESPALDOS].filter((m, i, a) => a.indexOf(m) === i);

  const entrada = sector
    ? `Tipo de entidad: ${sector}\n\nComportamiento observado:\n${texto}`
    : `Comportamiento observado:\n${texto}`;

  for (const modelo of modelos) {
    const reloj = AbortSignal.timeout(TIMEOUT_MS);
    try {
      const r = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        signal: reloj,
        headers: {
          'content-type': 'application/json',
          'x-api-key': clave,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: modelo,
          max_tokens: MAX_TOKENS,
          system: INSTRUCCIONES,
          messages: [{ role: 'user', content: entrada }],
        }),
      });
      if (!r.ok) {
        if (r.status === 404 || r.status === 400) continue;   // modelo inexistente: probar el siguiente
        return json(502, { error: 'api_error', estado: r.status }, origen);
      }
      const datos = await r.json();
      const crudo = (datos?.content || []).map(b => b?.text || '').join('').trim();
      const limpio = crudo.replace(/^```(?:json)?\s*|\s*```$/g, '');
      let analisis;
      try { analisis = JSON.parse(limpio); }
      catch { return json(502, { error: 'respuesta_no_json', crudo: limpio.slice(0, 400) }, origen); }
      return json(200, { ...analisis, _modelo: modelo }, origen);
    } catch (e) {
      if (e?.name === 'TimeoutError' || e?.name === 'AbortError')
        return json(504, { error: 'tiempo_agotado' }, origen);
      // error de red con este modelo: probar el siguiente
    }
  }
  return json(502, { error: 'sin_modelo_disponible' }, origen);
}

export const config = { path: '/api/analizar' };
