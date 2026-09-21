import React, { useState, useEffect, useMemo } from 'react';

/**
 * Visitantes um por um — inclusive quem abriu e foi embora sem deixar contato,
 * que é justamente quem nunca aparece na aba de leads.
 *
 * Cada linha é um navegador anônimo num curso. Não há nome, telefone nem IP:
 * só o número aleatório que o próprio navegador guardou. Quando aquele
 * navegador acabou deixando contato, o lead aparece ligado à linha.
 */

type Visita = {
  visitorId: string;
  courseSlug: string;
  courseName: string;
  primeiroAcesso: string;
  ultimoAcesso: string;
  acessos: number;
  moduloIndice: number;
  moduloTitulo: string;
  totalModulos: number;
  concluiu: boolean;
  utmSource: string;
  utmCampaign: string;
  utmContent: string;
  referrer: string;
  lead: { id: string; name: string; phone: string } | null;
};

type Filtro = 'todos' | 'so-abriu' | 'leu' | 'concluiu' | 'lead';

const FILTROS: { chave: Filtro; rotulo: string }[] = [
  { chave: 'todos', rotulo: 'Todos' },
  { chave: 'so-abriu', rotulo: 'Só abriu e saiu' },
  { chave: 'leu', rotulo: 'Leu além do 1º módulo' },
  { chave: 'concluiu', rotulo: 'Concluiu' },
  { chave: 'lead', rotulo: 'Virou lead' },
];

const toISODate = (d: Date) => d.toISOString().slice(0, 10);

function daysAgo(n: number) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return toISODate(d);
}

/** "há 3 min", "há 2 h", "ontem", "12/09" — mais legível que a data crua. */
function quando(iso: string) {
  const agora = Date.now();
  const t = new Date(iso).getTime();
  const min = Math.round((agora - t) / 60000);
  if (min < 1) return 'agora';
  if (min < 60) return `há ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `há ${h} h`;
  const d = Math.round(h / 24);
  if (d === 1) return 'ontem';
  if (d < 7) return `há ${d} dias`;
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

const horaExata = (iso: string) => new Date(iso).toLocaleString('pt-BR');

export default function VisitorsPanel() {
  const [from, setFrom] = useState(() => daysAgo(29));
  const [to, setTo] = useState(() => toISODate(new Date()));
  const [visitas, setVisitas] = useState<Visita[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filtro, setFiltro] = useState<Filtro>('todos');

  useEffect(() => {
    let cancelado = false;
    setLoading(true);
    setError('');
    fetch(`/api/admin/visitors?from=${from}&to=${to}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Erro ao carregar os visitantes');
        return data;
      })
      .then((data) => {
        if (cancelado) return;
        setVisitas(data.visitas || []);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelado) return;
        setError(err.message);
        setLoading(false);
      });
    return () => {
      cancelado = true;
    };
  }, [from, to]);

  const contagens = useMemo(() => {
    const c = { todos: visitas.length, 'so-abriu': 0, leu: 0, concluiu: 0, lead: 0 } as Record<Filtro, number>;
    for (const v of visitas) {
      if (v.concluiu) c.concluiu++;
      if (v.lead) c.lead++;
      // "Só abriu" é quem nunca passou do primeiro módulo e não concluiu.
      if (v.moduloIndice <= 0 && !v.concluiu) c['so-abriu']++;
      else if (!v.concluiu) c.leu++;
    }
    return c;
  }, [visitas]);

  const filtradas = useMemo(() => {
    switch (filtro) {
      case 'so-abriu':
        return visitas.filter((v) => v.moduloIndice <= 0 && !v.concluiu);
      case 'leu':
        return visitas.filter((v) => v.moduloIndice > 0 && !v.concluiu);
      case 'concluiu':
        return visitas.filter((v) => v.concluiu);
      case 'lead':
        return visitas.filter((v) => v.lead);
      default:
        return visitas;
    }
  }, [visitas, filtro]);

  const exportarCsv = () => {
    const esc = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const linhas = [
      ['Primeiro acesso', 'Último acesso', 'Curso', 'Acessos', 'Chegou até', 'De', 'Concluiu', 'Origem', 'Campanha', 'Post', 'Virou lead'].map(esc).join(','),
      ...filtradas.map((v) =>
        [
          horaExata(v.primeiroAcesso),
          horaExata(v.ultimoAcesso),
          v.courseName,
          v.acessos,
          v.moduloIndice < 0 ? 'só abriu' : `módulo ${v.moduloIndice + 1}`,
          v.totalModulos,
          v.concluiu ? 'sim' : 'não',
          v.utmSource,
          v.utmCampaign,
          v.utmContent,
          v.lead ? `${v.lead.name} ${v.lead.phone}` : 'não',
        ].map(esc).join(',')
      ),
    ];
    const blob = new Blob(['﻿' + linhas.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `visitantes-${from}-a-${to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const inputClass =
    'border border-border rounded-lg px-3 py-2 text-sm bg-background text-foreground outline-none focus:border-primary';

  return (
    <div>
      <div className="flex flex-wrap justify-between items-center gap-3 mb-2">
        <h1 className="text-3xl font-serif text-primary">Visitantes</h1>
        <button
          onClick={exportarCsv}
          disabled={!filtradas.length}
          className="border border-border bg-card px-4 py-2 rounded-lg text-sm font-medium hover:bg-secondary transition-colors disabled:opacity-40"
        >
          Exportar CSV
        </button>
      </div>
      <p className="text-sm text-muted-foreground mb-6">
        Uma linha por navegador e curso, inclusive quem não deixou contato. São dados
        anônimos: sem nome, telefone ou IP — só um número que o navegador guardou.
      </p>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <input type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} className={inputClass} />
        <span className="text-sm text-muted-foreground">até</span>
        <input type="date" value={to} min={from} max={toISODate(new Date())} onChange={(e) => setTo(e.target.value)} className={inputClass} />
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {FILTROS.map((f) => (
          <button
            key={f.chave}
            onClick={() => setFiltro(f.chave)}
            className={`px-3.5 py-2 rounded-lg text-sm font-medium border transition-colors ${
              filtro === f.chave
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border bg-card hover:bg-secondary'
            }`}
          >
            {f.rotulo}
            <span className={`ml-1.5 tabular-nums ${filtro === f.chave ? 'opacity-80' : 'text-muted-foreground'}`}>
              {contagens[f.chave]}
            </span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-20 text-center text-muted-foreground">Carregando...</div>
      ) : error ? (
        <div className="py-20 text-center text-red-500">{error}</div>
      ) : filtradas.length === 0 ? (
        <div className="py-16 text-center text-muted-foreground border border-dashed border-border rounded-xl">
          {visitas.length === 0
            ? 'Nenhum acesso registrado no período.'
            : 'Nenhum visitante neste filtro.'}
        </div>
      ) : (
        <div className="space-y-2.5">
          {filtradas.map((v) => {
            const soAbriu = v.moduloIndice <= 0 && !v.concluiu;
            const progresso = v.totalModulos > 0
              ? Math.round(((v.moduloIndice + 1) / v.totalModulos) * 100)
              : 0;

            return (
              <div
                key={`${v.visitorId}-${v.courseSlug}`}
                className="bg-card border border-border rounded-xl p-4 sm:p-5"
              >
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 mb-3">
                  <span className="font-semibold text-foreground text-[15px]">{v.courseName}</span>
                  <span className="text-xs text-muted-foreground" title={horaExata(v.ultimoAcesso)}>
                    {quando(v.ultimoAcesso)}
                  </span>
                  {v.acessos > 1 && (
                    <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded">
                      voltou {v.acessos}×
                    </span>
                  )}
                </div>

                {/* Barra de quanto do curso a pessoa leu */}
                <div className="flex items-center gap-3 mb-3">
                  <span className="h-2 flex-1 bg-secondary/70 rounded-full overflow-hidden">
                    <span
                      className={`block h-full rounded-r-full ${v.concluiu ? 'bg-emerald-500' : 'bg-primary'}`}
                      style={{ width: `${Math.max(progresso, v.moduloIndice >= 0 ? 4 : 0)}%` }}
                    />
                  </span>
                  <span className="text-[13px] tabular-nums shrink-0 text-muted-foreground">
                    {v.concluiu ? (
                      <span className="text-emerald-600 font-semibold">concluiu</span>
                    ) : soAbriu ? (
                      <span className="text-amber-600 font-medium">só abriu</span>
                    ) : (
                      <>módulo {v.moduloIndice + 1} de {v.totalModulos}</>
                    )}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="font-mono text-accent bg-accent/10 px-2 py-1 rounded">
                    /{v.courseSlug}
                  </span>
                  <span className="text-muted-foreground bg-secondary px-2 py-1 rounded">
                    origem: {v.utmSource}
                  </span>
                  {v.utmContent && (
                    <span className="text-muted-foreground bg-secondary px-2 py-1 rounded">
                      post: {v.utmContent}
                    </span>
                  )}
                  {v.moduloTitulo && !v.concluiu && v.moduloIndice > 0 && (
                    <span className="text-muted-foreground bg-secondary px-2 py-1 rounded">
                      parou em: {v.moduloTitulo}
                    </span>
                  )}
                  {v.lead ? (
                    <span className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-2 py-1 rounded font-medium">
                      deixou contato: {v.lead.name}
                      {v.lead.phone ? ` · ${v.lead.phone}` : ''}
                    </span>
                  ) : (
                    <span className="text-muted-foreground/70 px-2 py-1">sem contato</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
