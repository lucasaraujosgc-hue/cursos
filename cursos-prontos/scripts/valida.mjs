import fs from 'fs';
const c = JSON.parse(fs.readFileSync(process.argv[2], 'utf-8'));

const SUPORTADOS = new Set(['paragraph','heading','list','callout','highlight','timeline','checklist','math','calculator','breakeven-chart','breakdown-chart','comparison','classify-exercise','scenario-chart','quiz','accordion','table','steps','stats','video','image','quote','divider','cta']);

const usados = new Map();
const problemas = [];

function buildFn(keys, formula){
  const t=(formula||'').trim();
  const body = /;|\breturn\b/.test(t) ? t : `return ${t};`;
  return new Function(...keys, body);
}

c.modules.forEach((m, mi) => {
  if (!m.id || !m.shortTitle || !m.kicker || !m.title || !m.summary) problemas.push(`M${mi+1}: faltam campos obrigatorios`);
  if ((m.shortTitle||'').length > 22) problemas.push(`M${mi+1}: shortTitle longo (${m.shortTitle.length}) "${m.shortTitle}" — trunca no chip do celular`);
  m.content.forEach((b, bi) => {
    usados.set(b.type, (usados.get(b.type)||0)+1);
    if (!SUPORTADOS.has(b.type)) problemas.push(`M${mi+1}/b${bi+1}: TIPO NAO RENDERIZA "${b.type}"`);
    if (b.type === 'calculator') {
      if (!b.fields?.length) { problemas.push(`M${mi+1}/b${bi+1}: calculator sem fields`); return; }
      const keys = b.fields.map(f=>f.id);
      const args = b.fields.map(f => f.type==='select' ? (f.options?.[0] ?? '') : 100);
      try {
        const fn = buildFn(keys, b.formula);
        const r = fn(...args);
        if (b.resultFormat === 'object') {
          if (!r || typeof r !== 'object') problemas.push(`M${mi+1}/b${bi+1}: resultFormat object mas formula nao retorna objeto`);
          else {
            const declarados = new Set((b.resultFields||[]).map(f=>f.key));
            Object.keys(r).forEach(k => { if (k!=='aviso' && !declarados.has(k)) problemas.push(`M${mi+1}/b${bi+1}: chave "${k}" sem label em resultFields`); });
          }
        } else if (typeof r !== 'number' || !isFinite(r)) {
          problemas.push(`M${mi+1}/b${bi+1}: formula retorna ${JSON.stringify(r)} (esperado numero) — "${String(b.formula).slice(0,60)}"`);
        }
      } catch (e) {
        problemas.push(`M${mi+1}/b${bi+1}: ERRO na formula: ${e.message} — "${String(b.formula).slice(0,70)}"`);
      }
      b.fields.forEach(f=>{ if(!['number','currency','percentage','select','text'].includes(f.type)) problemas.push(`M${mi+1}/b${bi+1}: field.type invalido "${f.type}"`); });
    }
    if (b.type === 'classify-exercise') {
      (b.items||[]).forEach(it => { if (!(it in (b.answerKey||{}))) problemas.push(`M${mi+1}/b${bi+1}: item "${it}" sem resposta no answerKey`); });
      Object.values(b.answerKey||{}).forEach(v => { if (!(b.categories||[]).includes(v)) problemas.push(`M${mi+1}/b${bi+1}: answerKey aponta categoria inexistente "${v}"`); });
    }
    if (b.type === 'table') {
      const n = (b.headers||[]).length;
      (b.rows||[]).forEach((r,ri)=>{ if(r.length!==n) problemas.push(`M${mi+1}/b${bi+1}: linha ${ri+1} tem ${r.length} celulas, cabecalho tem ${n}`); });
    }
  });
});

console.log('BLOCOS USADOS:', [...usados.entries()].sort((a,b)=>b[1]-a[1]).map(([k,v])=>`${k}(${v})`).join(' '));
const naoUsados = [...SUPORTADOS].filter(t=>!usados.has(t));
console.log('\nDISPONIVEIS MAS NAO USADOS:', naoUsados.join(' ') || '(nenhum)');
console.log('\nPROBLEMAS:', problemas.length);
problemas.forEach(p=>console.log('  !', p));
