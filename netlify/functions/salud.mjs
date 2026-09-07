/**
 * Salud — Curso Oficial de Cumplimiento · GMC360 / 360Educa
 * Dice si la función de análisis está lista SIN revelar la llave ni el código.
 * Úsalo después de configurar las variables: /api/salud
 */
export default async () => {
  const tope = Number(process.env.TOPE_MENSUAL || 3000);
  return new Response(JSON.stringify({
    listo: Boolean(process.env.ANTHROPIC_API_KEY),
    llave_configurada: Boolean(process.env.ANTHROPIC_API_KEY),
    codigo_configurado: Boolean(process.env.CODIGO_CURSO),
    modelo: process.env.CLAUDE_MODEL || 'claude-sonnet-5',
    tope_mensual: tope,
    aviso_correo_configurado: Boolean(process.env.AVISO_CORREO),
    momento: new Date().toISOString(),
  }, null, 2), {
    status: 200,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });
};

export const config = { path: '/api/salud' };
