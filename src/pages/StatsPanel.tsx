import React, { useState, useEffect, useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

/**
 * Access dashboard. Everything here counts visitors whether or not they ever
 * registered — the numbers come from the anonymous event stream, not the leads.
 *
 * Categorical series colours are slots 1-3 of the validated palette, assigned in
 * fixed order. Slot 3 sits below 3:1 on a light surface, so the chart always
 * ships a legend plus a table view of the same numbers (the relief rule).
 */
const SERIES = {
  visitors: { key: 'visitors', label: 'Pessoas', color: '#2a78d6' },
  views: { key: 'views', label: 'Aberturas', color: '#eb6834' },
  leads: { key: 'leads', label: 'Leads', color: '#1baf7a' },
} as const;

type Stats = {
  from: string;
  to: string;
  totals: { views: number; visitors: number; completions: number; leads: number; moduleViews: number };
  daily: { date: string; views: number; visitors: number; completions: number; leads: number }[];
  courses: {
    slug: string;
    courseName: string;
    views: number;
    visitors: number;
    completions: number;
    completionRate: number;
    averageDepth: number;
    leads: number;
    funnel: { index: number; title: string; visitors: number; pctOfStart: number }[];
  }[];
  sources: {
    source: string;
    via: 'etiqueta' | 'referência' | 'direto';
    views: number;
    visitors: number;
    leads: number;
  }[];
};

const toISODate = (d: Date) => d.toISOString().slice(0, 10);

function daysAgo(n: number) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return toISODate(d);
}

/** "2026-09-21" -> "21/09" */
const shortDate = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
const fullDate = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;

const StatTile = ({
  value,
  label,
  hint,
}: {
  value: number | string;
  label: string;
  hint?: string;
}) => (
  <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
    <div className="font-serif font-bold text-[30px] sm:text-[36px] text-primary leading-none tabular-nums">
      {typeof value === 'number' ? value.toLocaleString('pt-BR') : value}
    </div>
    <div className="mt-2 text-[13px] font-medium text-foreground/90">{label}</div>
    {hint && <div className="mt-0.5 text-[12px] text-muted-foreground leading-snug">{hint}</div>}
  </div>
);

const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 shadow-md">
      <div className="text-[12px] font-semibold text-foreground mb-1.5">{fullDate(label)}</div>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center gap-2 text-[12px] text-muted-foreground">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
          <span>{p.name}</span>
          <span className="ml-auto font-semibold text-foreground tabular-nums">{p.value}</span>
        </div>
      ))}
    </div>
  );
};

export default function StatsPanel() {
  const [from, setFrom] = useState(() => daysAgo(29));
  const [to, setTo] = useState(() => toISODate(new Date()));
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showTable, setShowTable] = useState(false);
  const [openCourse, setOpenCourse] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    fetch(`/api/admin/stats?from=${from}&to=${to}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Erro ao carregar os acessos');
        return data;
      })
      .then((data) => {
        if (cancelled) return;
        setStats(data);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.message);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [from, to]);

  const preset = (days: number) => {
    setFrom(daysAgo(days - 1));
    setTo(toISODate(new Date()));
  };

  const activePreset = useMemo(() => {
    if (to !== toISODate(new Date())) return null;
    for (const days of [7, 30, 90]) {
      if (from === daysAgo(days - 1)) return days;
    }
    return null;
  }, [from, to]);

  const exportCsv = () => {
    if (!stats) return;
    const esc = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const lines: string[] = [];

    lines.push(esc('Acessos por dia'));
    lines.push(['Data', 'Pessoas', 'Aberturas', 'Conclusões', 'Leads'].map(esc).join(','));
    stats.daily.forEach((d) =>
      lines.push([fullDate(d.date), d.visitors, d.views, d.completions, d.leads].map(esc).join(','))
    );

    lines.push('');
    lines.push(esc('Por curso'));
    lines.push(['Curso', 'Link', 'Pessoas', 'Aberturas', 'Conclusões', '% conclusão', 'Módulo médio', 'Leads'].map(esc).join(','));
    stats.courses.forEach((c) =>
      lines.push([c.courseName, `/${c.slug}`, c.visitors, c.views, c.completions, `${c.completionRate}%`, c.averageDepth, c.leads].map(esc).join(','))
    );

    lines.push('');
    lines.push(esc('Até que módulo chegaram'));
    lines.push(['Curso', 'Módulo', 'Título', 'Pessoas', '% de quem começou'].map(esc).join(','));
    stats.courses.forEach((c) =>
      c.funnel.forEach((f) =>
        lines.push([c.courseName, f.index + 1, f.title, f.visitors, `${f.pctOfStart}%`].map(esc).join(','))
      )
    );

    lines.push('');
    lines.push(esc('Origem do tráfego'));
    lines.push(['Origem', 'Como foi identificada', 'Pessoas', 'Aberturas', 'Leads'].map(esc).join(','));
    stats.sources.forEach((s) =>
      lines.push([s.source, s.via, s.visitors, s.views, s.leads].map(esc).join(','))
    );

    const blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `acessos-${from}-a-${to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const inputClass =
    'border border-border rounded-lg px-3 py-2 text-sm bg-background text-foreground outline-none focus:border-primary';

  return (
    <div>
      <div className="flex flex-wrap justify-between items-center gap-3 mb-2">
        <h1 className="text-3xl font-serif text-primary">Acessos</h1>
        <button
          onClick={exportCsv}
          disabled={!stats}
          className="border border-border bg-card px-4 py-2 rounded-lg text-sm font-medium hover:bg-secondary transition-colors disabled:opacity-40"
        >
          Exportar CSV
        </button>
      </div>
      <p className="text-sm text-muted-foreground mb-6">
        Conta todo mundo que abre um curso, tenha se cadastrado ou não. "Pessoas" conta cada uma uma vez só, por mais vezes que ela volte.
      </p>

      {/* Filters, in one row above the charts */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        {[7, 30, 90].map((days) => (
          <button
            key={days}
            onClick={() => preset(days)}
            className={`px-3.5 py-2 rounded-lg text-sm font-medium border transition-colors ${
              activePreset === days
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border bg-card hover:bg-secondary'
            }`}
          >
            {days} dias
          </button>
        ))}
        <div className="flex items-center gap-2 ml-1">
          <input type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} className={inputClass} />
          <span className="text-sm text-muted-foreground">até</span>
          <input type="date" value={to} min={from} max={toISODate(new Date())} onChange={(e) => setTo(e.target.value)} className={inputClass} />
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center text-muted-foreground">Carregando...</div>
      ) : error ? (
        <div className="py-20 text-center text-red-500">{error}</div>
      ) : stats ? (
        <div className="space-y-8">
          {/* Headline numbers */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatTile
              value={stats.totals.visitors}
              label="Pessoas"
              hint="cada uma contada uma vez, por mais que volte"
            />
            <StatTile
              value={stats.totals.views}
              label="Aberturas"
              hint={
                stats.totals.visitors > 0
                  ? `${(Math.round((stats.totals.views / stats.totals.visitors) * 10) / 10)
                      .toLocaleString('pt-BR')} por pessoa, em média`
                  : 'cursos abertos no período'
              }
            />
            <StatTile value={stats.totals.completions} label="Conclusões" hint="chegaram ao último módulo" />
            <StatTile value={stats.totals.leads} label="Leads" hint="deixaram contato" />
          </div>

          {/* Daily series */}
          <section className="rounded-xl border border-border bg-card p-4 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
              <div>
                <h2 className="font-serif text-xl text-primary">Acessos por dia</h2>
                <p className="text-[13px] text-muted-foreground mt-0.5">
                  {fullDate(from)} a {fullDate(to)}
                </p>
              </div>
              <button
                onClick={() => setShowTable((v) => !v)}
                className="border border-border px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-secondary transition-colors"
              >
                {showTable ? 'Ver gráfico' : 'Ver tabela'}
              </button>
            </div>

            {showTable ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[420px] text-left text-sm">
                  <thead className="text-muted-foreground border-b border-border">
                    <tr>
                      <th className="py-2 pr-4 font-medium">Data</th>
                      <th className="py-2 px-4 font-medium text-right">Pessoas</th>
                      <th className="py-2 px-4 font-medium text-right">Aberturas</th>
                      <th className="py-2 px-4 font-medium text-right">Conclusões</th>
                      <th className="py-2 pl-4 font-medium text-right">Leads</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {stats.daily.filter((d) => d.views || d.leads || d.completions).map((d) => (
                      <tr key={d.date}>
                        <td className="py-2 pr-4">{fullDate(d.date)}</td>
                        <td className="py-2 px-4 text-right tabular-nums">{d.visitors}</td>
                        <td className="py-2 px-4 text-right tabular-nums">{d.views}</td>
                        <td className="py-2 px-4 text-right tabular-nums">{d.completions}</td>
                        <td className="py-2 pl-4 text-right tabular-nums">{d.leads}</td>
                      </tr>
                    ))}
                    {!stats.daily.some((d) => d.views || d.leads || d.completions) && (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-muted-foreground">
                          Nenhum acesso no período.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="h-[280px] sm:h-[320px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={stats.daily} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid vertical={false} stroke="currentColor" className="text-border" strokeOpacity={0.6} />
                    <XAxis
                      dataKey="date"
                      tickFormatter={shortDate}
                      tick={{ fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                      minTickGap={24}
                    />
                    <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={36} allowDecimals={false} />
                    <Tooltip content={<ChartTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} iconType="plainline" />
                    {Object.values(SERIES).map((s) => (
                      <Line
                        key={s.key}
                        type="monotone"
                        dataKey={s.key}
                        name={s.label}
                        stroke={s.color}
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 4, strokeWidth: 2, stroke: 'var(--card)' }}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </section>

          {/* Per course */}
          <section>
            <h2 className="font-serif text-xl text-primary mb-4">Por curso</h2>
            <div className="space-y-3">
              {stats.courses.map((course) => {
                const open = openCourse === course.slug;
                const maxFunnel = Math.max(1, ...course.funnel.map((f) => f.visitors));
                return (
                  <div key={course.slug} className="rounded-xl border border-border bg-card overflow-hidden">
                    <button
                      onClick={() => setOpenCourse(open ? null : course.slug)}
                      className="w-full text-left p-4 sm:p-5 hover:bg-secondary/30 transition-colors"
                    >
                      <div className="flex flex-wrap items-baseline justify-between gap-2 mb-3">
                        <span className="font-serif text-lg text-primary">{course.courseName}</span>
                        <span className="text-xs font-mono text-accent bg-accent/10 px-2 py-1 rounded">/{course.slug}</span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-x-4 gap-y-3">
                        {[
                          { v: course.visitors, l: 'Pessoas' },
                          { v: course.views, l: 'Aberturas' },
                          { v: course.completions, l: 'Conclusões' },
                          { v: `${course.completionRate}%`, l: 'Conclusão' },
                          { v: course.leads, l: 'Leads' },
                        ].map((cell) => (
                          <div key={cell.l}>
                            <div className="font-serif font-bold text-xl text-foreground tabular-nums">{cell.v}</div>
                            <div className="text-[12px] text-muted-foreground">{cell.l}</div>
                          </div>
                        ))}
                      </div>
                      {course.funnel.length > 0 && (
                        <div className="mt-3 text-[13px] text-muted-foreground">
                          Em média pararam no módulo {course.averageDepth || '—'} de {course.funnel.length} ·{' '}
                          <span className="text-primary font-medium">
                            {open ? 'ocultar detalhe' : 'ver até onde chegaram'}
                          </span>
                        </div>
                      )}
                    </button>

                    {open && course.funnel.length > 0 && (
                      <div className="px-4 sm:px-5 pb-5 pt-1 border-t border-border">
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mt-4 mb-3">
                          Até que módulo chegaram
                        </h3>
                        <ul className="space-y-2.5">
                          {course.funnel.map((step) => (
                            <li key={step.index} className="flex items-center gap-3">
                              <span className="w-6 shrink-0 text-[12px] text-muted-foreground tabular-nums text-right">
                                {step.index + 1}
                              </span>
                              <span className="w-28 sm:w-40 shrink-0 text-[13px] text-foreground/90 truncate">
                                {step.title}
                              </span>
                              <span className="flex-1 h-5 bg-secondary/60 rounded-[4px] overflow-hidden min-w-[40px]">
                                <span
                                  className="block h-full bg-primary rounded-r-[4px]"
                                  style={{ width: `${Math.round((step.visitors / maxFunnel) * 100)}%` }}
                                />
                              </span>
                              <span className="w-24 shrink-0 text-right text-[12px] tabular-nums">
                                <span className="font-semibold text-foreground">{step.visitors}</span>
                                <span className="text-muted-foreground"> · {step.pctOfStart}%</span>
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                );
              })}
              {stats.courses.length === 0 && (
                <div className="text-center py-12 text-muted-foreground border border-dashed border-border rounded-xl">
                  Nenhum curso cadastrado.
                </div>
              )}
            </div>
          </section>

          {/* Traffic source */}
          <section>
            <h2 className="font-serif text-xl text-primary mb-1">De onde vieram</h2>
            <p className="text-[13px] text-muted-foreground mb-4">
              Primeiro a etiqueta <code className="font-mono">utm_source</code> do link; sem ela, o site que
              trouxe a pessoa. "Direto" é só quem chegou sem nenhum dos dois — link digitado, salvo nos
              favoritos ou aberto por um app que não informa a origem.
            </p>
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[420px] text-left text-sm">
                  <thead className="bg-secondary/50 text-muted-foreground border-b border-border">
                    <tr>
                      <th className="p-3 font-medium">Origem</th>
                      <th className="p-3 font-medium text-right">Pessoas</th>
                      <th className="p-3 font-medium text-right">Aberturas</th>
                      <th className="p-3 font-medium text-right">Leads</th>
                      <th className="p-3 font-medium text-right">Conversão</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {stats.sources.map((s) => (
                      <tr key={s.source}>
                        <td className="p-3 font-medium text-foreground">
                          {s.source}
                          {s.via === 'referência' && (
                            <span className="ml-2 text-[11px] font-normal text-muted-foreground">
                              por referência
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-right tabular-nums">{s.visitors}</td>
                        <td className="p-3 text-right tabular-nums">{s.views}</td>
                        <td className="p-3 text-right tabular-nums">{s.leads}</td>
                        <td className="p-3 text-right tabular-nums text-muted-foreground">
                          {s.visitors > 0 ? `${Math.round((s.leads / s.visitors) * 1000) / 10}%` : '—'}
                        </td>
                      </tr>
                    ))}
                    {stats.sources.length === 0 && (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-muted-foreground">
                          Nenhum acesso registrado no período.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
