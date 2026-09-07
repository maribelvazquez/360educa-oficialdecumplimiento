/**
 * Salud — Curso Oficial de Cumplimiento · GMC360 / 360Educa
 *
 *   /api/salud            dice si la configuración está puesta, sin revelar nada.
 *   /api/salud?probar=1   además hace UNA llamada real y mínima a la API y te dice
 *                         exactamente qué contestó. Cuesta una fracción de centavo
 *                         y sirve para saber por qué el clasificador cae al respaldo.
 */
export default async (peticion) => {
  const url = new URL(peticion.url);
  const probar = url.searchParams.get('probar') === '1';
  // .trim() a propósito: un espacio o salto de línea pegado por accidente
  // produce un 401 «invalid x-api-key» imposible de ver a simple vista.
  const clave = (process.env.ANTHROPIC_API_KEY || "").trim();

  const salida = {
    version_desplegada: 'v1.5 · techo de tokens corregido',
    listo: Boolean(clave),
    llave_configurada: Boolean(clave),
    origenes_configurados: Boolean(process.env.ORIGENES_PERMITIDOS),
    codigo_configurado: Boolean(process.env.CODIGO_CURSO),
    modelo: process.env.CLAUDE_MODEL || 'claude-sonnet-5',
    tope_mensual: Number(process.env.TOPE_MENSUAL || 3000),
    aviso_correo_configurado: Boolean(process.env.AVISO_CORREO),
    momento: new Date().toISOString(),
  };

  // Huella de la llave para poder compararla SIN revelarla.
  if (clave) {
    const crudo = process.env.ANTHROPIC_API_KEY || '';
    salida.llave = {
      largo: clave.length,
      empieza: clave.slice(0, 14),
      termina: clave.slice(-6),
      tenia_espacios: crudo !== crudo.trim(),
      forma_correcta: /^sk-ant-/.test(clave),
    };
  }

  if (probar) {
    if (!clave) {
      salida.prueba = { ok: false, diagnostico: 'No hay llave configurada.' };
    } else {
      // Primero: preguntarle a la cuenta qué modelos tiene. Así no adivinamos.
      try {
        const rm = await fetch('https://api.anthropic.com/v1/models?limit=40', {
          signal: AbortSignal.timeout(15000),
          headers: { 'x-api-key': clave, 'anthropic-version': '2023-06-01' },
        });
        if (rm.ok) {
          const jm = await rm.json();
          salida.modelos_de_tu_cuenta = (jm?.data || []).map(m => m.id);
          salida.modelo_configurado_existe = salida.modelos_de_tu_cuenta.includes(salida.modelo);
        } else {
          salida.modelos_de_tu_cuenta = 'no se pudo consultar (estado ' + rm.status + ')';
        }
      } catch (e) {
        salida.modelos_de_tu_cuenta = 'no se pudo consultar: ' + String(e?.message || e).slice(0,120);
      }
      try {
        const r = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          signal: AbortSignal.timeout(20000),
          headers: { 'content-type':'application/json', 'x-api-key': clave, 'anthropic-version':'2023-06-01' },
          body: JSON.stringify({
            model: salida.modelo,
            max_tokens: 8,
            messages: [{ role:'user', content:'Responde únicamente: ok' }],
          }),
        });
        const cuerpo = await r.text();
        if (r.ok) {
          salida.prueba = { ok: true, estado: r.status,
            diagnostico: 'La API respondió bien. El clasificador debería funcionar.' };
        } else {
          let tipo = '', mensaje = '';
          try { const j = JSON.parse(cuerpo); tipo = j?.error?.type || ''; mensaje = j?.error?.message || ''; }
          catch { mensaje = cuerpo.slice(0, 300); }
          const guia = {
            authentication_error: 'La llave no es válida o fue revocada. Genera una nueva en la consola.',
            permission_error:     'La llave existe pero no tiene permiso para este modelo o este espacio de trabajo.',
            invalid_request_error:'Petición rechazada. Casi siempre es el nombre del modelo: revisa CLAUDE_MODEL.',
            not_found_error:      'Ese modelo no existe para tu cuenta. Cambia CLAUDE_MODEL por uno disponible.',
            rate_limit_error:     'Sin saldo o límite de gasto alcanzado. Carga saldo o sube el límite en Billing.',
            billing_error:        'Problema de facturación. Carga saldo en platform.claude.com/settings/billing.',
            overloaded_error:     'La API está saturada en este momento. Vuelve a intentar en unos minutos.',
          }[tipo] || 'Error no identificado. El mensaje de arriba lo dice literal.';
          salida.prueba = { ok:false, estado:r.status, tipo, mensaje: mensaje.slice(0,300), diagnostico: guia };
        }
      } catch (e) {
        salida.prueba = { ok:false, tipo: e?.name || 'error_de_red',
          mensaje: String(e?.message || e).slice(0,300),
          diagnostico: 'La función no pudo salir a internet o se agotó el tiempo.' };
      }
    }
    salida.listo = Boolean(clave) && salida.prueba.ok === true;
  }

  return new Response(JSON.stringify(salida, null, 2), {
    status: 200,
    headers: { 'content-type':'application/json; charset=utf-8', 'cache-control':'no-store' },
  });
};

export const config = { path: '/api/salud' };
