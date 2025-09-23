export function simpleSearch(query, dataset, options = {}) {
  if (!query || !query.trim()) return dataset;
  const q = query.trim().toLowerCase();
  const fields = options.fields || ['persona_id', 'Nombre', 'nombre', 'contrato_id', 'email'];

  return dataset.filter(item => {
    try {
      for (const f of fields) {
        const val = (item[f] !== undefined && item[f] !== null) ? String(item[f]).toLowerCase() : '';
        if (val.includes(q)) return true;
      }
    } catch (e) { /* ignore and continue */ }
    return false;
  });
}

/**
 * Búsqueda global que ejecuta simpleSearch por categoría y devuelve top N por categoría
 * datasets: { personas, contratos, precontractual }
 */
export function globalSearch(query, datasets = {}, options = {}) {
  const limit = options.limit || 8;
  const q = (query || '').trim();
  if (!q) return [];

  const results = [];

  if (Array.isArray(datasets.personas)) {
    const found = simpleSearch(q, datasets.personas, { fields: ['persona_id', 'Nombre', 'nombre', 'email'] });
    if (found.length) results.push({ category: 'Personas', key: 'personas', items: found.slice(0, limit) });
  }

  if (Array.isArray(datasets.contratos)) {
    const found = simpleSearch(q, datasets.contratos, { fields: ['contrato_id', 'Numero_contrato', 'persona_id'] });
    if (found.length) results.push({ category: 'Contratos', key: 'contratos', items: found.slice(0, limit) });
  }

  if (Array.isArray(datasets.precontractual)) {
    const found = simpleSearch(q, datasets.precontractual, { fields: ['persona_id', 'nombre', 'Nombre'] });
    if (found.length) results.push({ category: 'Precontractual', key: 'precontractual', items: found.slice(0, limit) });
  }

  return results;
}
