/**
 * Recharts pulls in ~400kb. It lives in its own module so the course only
 * downloads it when a module actually contains a chart — most don't.
 */
import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const formatCurrency = (value: number) => `R$ ${value.toLocaleString('pt-BR')}`;

export const BreakevenChartBlock = ({ block }: { block: any }) => {
  const data = [];
  const qtyMax = block.quantidadeMaxima || 1000;
  for (let i = 0; i <= qtyMax; i += Math.max(1, Math.floor(qtyMax / 10))) {
    data.push({
      quantidade: i,
      custoTotal: block.custoFixo + (block.custoVariavelUnitario * i),
      receitaTotal: block.precoVenda * i,
    });
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4 sm:p-5 mt-8 shadow-sm">
      <h3 className="font-serif font-semibold text-[18px] text-primary mb-4 text-center">Ponto de Equilíbrio</h3>
      <div className="h-[260px] sm:h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 8, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis dataKey="quantidade" tick={{ fontSize: 11 }} />
            <YAxis tickFormatter={formatCurrency} tick={{ fontSize: 11 }} width={70} />
            <Tooltip formatter={(value: number) => formatCurrency(value)} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Line type="monotone" dataKey="custoTotal" name="Custo Total" stroke="#ef4444" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="receitaTotal" name="Receita Total" stroke="#10b981" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export const BreakdownChartBlock = ({ block }: { block: any }) => {
  const COLORS = ['#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  return (
    <div className="rounded-xl border border-border bg-card p-4 sm:p-5 mt-8 shadow-sm">
      <h3 className="font-serif font-semibold text-[18px] text-primary mb-4 text-center">
        Detalhamento de Custos (Total: {formatCurrency(block.total)})
      </h3>
      <div className="h-[280px] sm:h-[300px] w-full flex flex-col md:flex-row items-center justify-center">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={block.parts}
              cx="50%"
              cy="45%"
              innerRadius="45%"
              outerRadius="72%"
              paddingAngle={2}
              dataKey="value"
              nameKey="label"
            >
              {block.parts.map((entry: any, index: number) => (
                <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(value: number) => formatCurrency(value)} />
            <Legend
              layout="horizontal"
              verticalAlign="bottom"
              align="center"
              wrapperStyle={{ fontSize: 12 }}
              formatter={(value, entry: any) => entry.payload.label}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export const ScenarioChartBlock = ({ block }: { block: any }) => {
  const data = [];
  const step = Math.max(1, Math.floor((block.qtdMax - block.qtdMin) / 10));
  for (let i = block.qtdMin; i <= block.qtdMax; i += step) {
    const custoTotal = block.custoFixo + (block.custoVariavelUnitario * i);
    data.push({
      quantidade: i,
      custoTotal,
      custoVariavelTotal: block.custoVariavelUnitario * i,
      custoUnitario: custoTotal / i,
    });
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4 sm:p-5 mt-8 shadow-sm">
      <h3 className="font-serif font-semibold text-[18px] text-primary mb-4 text-center">Análise de Cenários de Custo</h3>
      <div className="h-[260px] sm:h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 4, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis dataKey="quantidade" tick={{ fontSize: 11 }} />
            <YAxis yAxisId="left" tickFormatter={formatCurrency} tick={{ fontSize: 11 }} width={64} />
            <YAxis yAxisId="right" orientation="right" tickFormatter={formatCurrency} tick={{ fontSize: 11 }} width={56} />
            <Tooltip formatter={(value: number) => formatCurrency(value)} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Line yAxisId="left" type="monotone" dataKey="custoTotal" name="Custo Total" stroke="#ef4444" strokeWidth={2} />
            <Line yAxisId="right" type="monotone" dataKey="custoUnitario" name="Custo Unitário" stroke="#8b5cf6" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
