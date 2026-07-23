import React, { useState, useEffect } from 'react';
import { Block } from '../types';
import { InlineMath, BlockMath } from 'react-katex';
import 'katex/dist/katex.min.css';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, ReferenceLine } from 'recharts';

const renderTextWithLinks = (text: string) => {
  if (!text || typeof text !== 'string') return text;
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);
  
  return parts.map((part, i) => {
    if (part.match(urlRegex)) {
      return (
        <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-emerald-600 hover:text-emerald-700 underline font-medium">
          {part}
        </a>
      );
    }
    return part;
  });
};

export const BreakevenChartBlock = ({ block }: { block: any }) => {
  const data = [];
  const qtyMax = block.quantidadeMaxima || 1000;
  for (let i = 0; i <= qtyMax; i += Math.max(1, Math.floor(qtyMax / 10))) {
    const custoTotal = block.custoFixo + (block.custoVariavelUnitario * i);
    const receitaTotal = block.precoVenda * i;
    data.push({
      quantidade: i,
      custoTotal,
      receitaTotal
    });
  }

  const formatCurrency = (value: number) => `R$ ${value.toLocaleString('pt-BR')}`;

  return (
    <div className="rounded-xl border border-border bg-card p-5 mt-8 shadow-sm">
      <h3 className="font-serif font-semibold text-[18px] text-primary mb-4 text-center">Ponto de Equilíbrio</h3>
      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis dataKey="quantidade" />
            <YAxis tickFormatter={formatCurrency} />
            <Tooltip formatter={(value: number) => formatCurrency(value)} />
            <Legend />
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
  const formatCurrency = (value: number) => `R$ ${value.toLocaleString('pt-BR')}`;

  return (
    <div className="rounded-xl border border-border bg-card p-5 mt-8 shadow-sm">
      <h3 className="font-serif font-semibold text-[18px] text-primary mb-4 text-center">Detalhamento de Custos (Total: {formatCurrency(block.total)})</h3>
      <div className="h-[300px] w-full flex flex-col md:flex-row items-center justify-center">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={block.parts}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={2}
              dataKey="value"
              nameKey="label"
            >
              {block.parts.map((entry: any, index: number) => (
                <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(value: number) => formatCurrency(value)} />
            <Legend layout="horizontal" verticalAlign="bottom" align="center" formatter={(value, entry: any) => entry.payload.label} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export const ComparisonBlock = ({ block }: { block: any }) => {
  const getToneClasses = (tone: string) => {
    if (tone === 'negative') return 'bg-red-50 border-red-200 text-red-900';
    if (tone === 'positive') return 'bg-emerald-50 border-emerald-200 text-emerald-900';
    return 'bg-slate-50 border-slate-200 text-slate-900';
  };

  const getToneIcon = (tone: string) => {
    if (tone === 'negative') return '✕';
    if (tone === 'positive') return '✓';
    return '•';
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
      {block.columns.map((col: any, idx: number) => (
        <div key={idx} className={`rounded-xl border p-5 ${getToneClasses(col.tone)}`}>
          <h3 className="font-serif font-semibold text-lg mb-4 text-center">{col.label}</h3>
          <ul className="space-y-3">
            {col.items.map((item: string, i: number) => (
              <li key={i} className="flex gap-3 items-start">
                <span className="font-bold opacity-50 mt-0.5">{getToneIcon(col.tone)}</span>
                <span className="text-[15px] leading-relaxed">{renderTextWithLinks(item)}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
};

export const ClassifyExerciseBlock = ({ block, moduleIndex }: { block: any, moduleIndex: number }) => {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [showResult, setShowResult] = useState(false);

  useEffect(() => {
    setAnswers({});
    setShowResult(false);
  }, [moduleIndex]);

  const handleSelect = (item: string, category: string) => {
    if (showResult) return;
    setAnswers(prev => ({ ...prev, [item]: category }));
  };

  const checkAnswers = () => {
    setShowResult(true);
  };

  const allAnswered = block.items.every((item: string) => answers[item]);
  let score = 0;
  if (showResult) {
    block.items.forEach((item: string) => {
      if (answers[item] === block.answerKey[item]) score++;
    });
  }

  return (
    <div className="rounded-xl border border-border bg-card p-6 mt-8 shadow-sm">
      <h3 className="font-serif font-semibold text-xl text-primary mb-6">Exercício de Classificação</h3>
      
      <div className="space-y-6">
        {block.items.map((item: string, i: number) => {
          const isCorrect = answers[item] === block.answerKey[item];
          return (
            <div key={i} className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-lg bg-secondary/30 border border-border">
              <span className="text-[16px] font-medium flex-1">{item}</span>
              <div className="flex flex-wrap gap-2">
                {block.categories.map((cat: string, j: number) => {
                  const isSelected = answers[item] === cat;
                  let btnClass = "px-3 py-1.5 rounded-md text-sm font-medium border transition-colors ";
                  if (!showResult) {
                    btnClass += isSelected ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-secondary text-foreground border-border";
                  } else {
                    if (cat === block.answerKey[item]) {
                      btnClass += "bg-emerald-500 text-white border-emerald-500";
                    } else if (isSelected && !isCorrect) {
                      btnClass += "bg-red-500 text-white border-red-500";
                    } else {
                      btnClass += "bg-background text-muted-foreground border-border opacity-50";
                    }
                  }
                  return (
                    <button
                      key={j}
                      disabled={showResult}
                      onClick={() => handleSelect(item, cat)}
                      className={btnClass}
                    >
                      {cat}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      
      <div className="mt-8 flex items-center justify-between">
        {!showResult ? (
          <button 
            disabled={!allAnswered}
            onClick={checkAnswers}
            className="bg-primary text-primary-foreground px-6 py-2.5 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors"
          >
            Verificar Respostas
          </button>
        ) : (
          <div className="flex items-center gap-4">
            <span className={`font-serif font-bold text-xl ${score === block.items.length ? 'text-emerald-500' : 'text-primary'}`}>
              Você acertou {score} de {block.items.length}!
            </span>
            <button 
              onClick={() => { setAnswers({}); setShowResult(false); }}
              className="px-4 py-2 text-sm font-medium border border-border rounded-lg hover:bg-secondary transition-colors"
            >
              Tentar Novamente
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export const ScenarioChartBlock = ({ block }: { block: any }) => {
  const data = [];
  const step = Math.max(1, Math.floor((block.qtdMax - block.qtdMin) / 10));
  for (let i = block.qtdMin; i <= block.qtdMax; i += step) {
    const custoVariavelTotal = block.custoVariavelUnitario * i;
    const custoTotal = block.custoFixo + custoVariavelTotal;
    const custoUnitario = custoTotal / i;
    data.push({
      quantidade: i,
      custoTotal,
      custoVariavelTotal,
      custoUnitario,
    });
  }

  const formatCurrency = (value: number) => `R$ ${value.toLocaleString('pt-BR')}`;

  return (
    <div className="rounded-xl border border-border bg-card p-5 mt-8 shadow-sm">
      <h3 className="font-serif font-semibold text-[18px] text-primary mb-4 text-center">Análise de Cenários de Custo</h3>
      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis dataKey="quantidade" />
            <YAxis yAxisId="left" tickFormatter={formatCurrency} />
            <YAxis yAxisId="right" orientation="right" tickFormatter={formatCurrency} />
            <Tooltip formatter={(value: number) => formatCurrency(value)} />
            <Legend />
            <Line yAxisId="left" type="monotone" dataKey="custoTotal" name="Custo Total" stroke="#ef4444" strokeWidth={2} />
            <Line yAxisId="right" type="monotone" dataKey="custoUnitario" name="Custo Unitário" stroke="#8b5cf6" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export const ChecklistBlock = ({ items, moduleIndex }: { items: string[], moduleIndex: number }) => {
  const [checked, setChecked] = useState<Set<number>>(new Set());

  useEffect(() => {
    setChecked(new Set());
  }, [moduleIndex]);

  const toggle = (i: number) => {
    const next = new Set(checked);
    if (next.has(i)) next.delete(i);
    else next.add(i);
    setChecked(next);
  };
  
  return (
    <ul className="space-y-2 mt-8">
      {items.map((item, i) => {
        const isChecked = checked.has(i);
        return (
          <li key={i}>
            <button
              onClick={() => toggle(i)}
              className={`w-full flex gap-3 items-start text-left p-3.5 rounded-lg border transition-colors ${
                isChecked ? 'border-primary/30 bg-primary/5' : 'border-border bg-card hover:border-primary/30'
              }`}
            >
              <div className={`mt-0.5 h-5 w-5 shrink-0 rounded border-2 text-[10px] flex items-center justify-center font-bold transition-colors ${
                isChecked ? 'border-primary bg-primary text-primary-foreground' : 'border-border'
              }`}>
                {isChecked && "✓"}
              </div>
              <span className={`text-[15px] leading-relaxed transition-colors ${
                isChecked ? 'text-muted-foreground line-through' : 'text-foreground/90'
              }`}>
                {renderTextWithLinks(item)}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
};

export const CalculatorBlock = ({ block, moduleIndex }: { block: any, moduleIndex: number }) => {
  const [values, setValues] = useState<Record<string, number>>({});

  useEffect(() => {
    setValues({});
  }, [moduleIndex]);

  const handleChange = (id: string, val: string) => {
    const num = parseFloat(val.replace(',', '.'));
    setValues(prev => ({ ...prev, [id]: isNaN(num) ? 0 : num }));
  };

  let result = 0;
  try {
    const keys = Object.keys(values);
    const args = keys.map(k => values[k]);
    // Allow basic formula execution with given field IDs
    const func = new Function(...keys, `return ${block.formula}`);
    result = func(...args) || 0;
  } catch (err) {
    // Ignore invalid formulas during typing or if incomplete
  }

  const formatResult = (val: number) => {
    if (block.resultFormat === 'currency') return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    if (block.resultFormat === 'percentage') return val.toLocaleString('pt-BR', { maximumFractionDigits: 2 }) + '%';
    return val.toLocaleString('pt-BR', { maximumFractionDigits: 2 });
  };

  return (
    <div className="rounded-xl border border-border bg-card p-5 mt-8 shadow-sm">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        {block.fields.map((f: any) => (
          <div key={f.id}>
            <label className="block text-sm font-medium text-foreground mb-1">{f.label}</label>
            <div className="relative">
              {f.type === 'currency' && <span className="absolute left-3 top-2.5 text-muted-foreground">R$</span>}
              <input 
                type="number" 
                step="any"
                placeholder={f.placeholder}
                onChange={(e) => handleChange(f.id, e.target.value)}
                className={`w-full p-2.5 rounded-lg border border-border bg-background focus:outline-none focus:border-primary ${f.type === 'currency' ? 'pl-9' : ''}`}
              />
              {f.type === 'percentage' && <span className="absolute right-3 top-2.5 text-muted-foreground">%</span>}
            </div>
          </div>
        ))}
      </div>
      <div className="bg-primary/5 rounded-lg p-4 flex flex-col sm:flex-row items-center justify-between border border-primary/20">
        <span className="font-sans font-medium text-muted-foreground">{block.resultLabel}</span>
        <span className="font-serif font-bold text-2xl text-primary">{formatResult(result)}</span>
      </div>
    </div>
  );
};

export const BlockRenderer: React.FC<{ block: Block, moduleIndex: number }> = ({ block, moduleIndex }) => {
  switch (block.type) {
    case 'paragraph':
      return <p className="text-[17px] leading-relaxed text-foreground/90">{renderTextWithLinks(block.text)}</p>;
    
    case 'heading':
      return <h2 className="font-serif font-semibold text-[20px] text-primary pt-2">{renderTextWithLinks(block.text)}</h2>;
    
    case 'list':
      return (
        <ul className="space-y-3">
          {block.items.map((item, i) => (
            <li key={i} className="flex gap-3 items-baseline">
              <div className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
              <span className="text-[17px] leading-relaxed text-foreground/90">{renderTextWithLinks(item)}</span>
            </li>
          ))}
        </ul>
      );
    
    case 'callout':
      return (
        <div className="rounded-xl border-l-4 border-accent bg-accent/10 p-5 mt-8">
          <h3 className="font-sans font-semibold uppercase text-[14px] tracking-wider text-accent-foreground/80 mb-3">
            {renderTextWithLinks(block.title)}
          </h3>
          <ul className="space-y-2.5">
            {block.items.map((item, i) => (
              <li key={i} className="flex gap-2.5 items-baseline">
                <span className="text-accent text-sm">•</span>
                <span className="text-[15px] text-foreground/90">{renderTextWithLinks(item)}</span>
              </li>
            ))}
          </ul>
        </div>
      );
    
    case 'highlight':
      return (
        <div className="border-l-4 border-primary bg-primary/5 px-5 py-4 mt-8">
          <p className="text-[17px] italic text-primary leading-relaxed">{renderTextWithLinks(block.text)}</p>
        </div>
      );
    
    case 'timeline':
      return (
        <div className="space-y-3 mt-8">
          {block.items.map((item, i) => (
            <div key={i} className="grid grid-cols-[90px_1fr] items-start gap-4 rounded-lg border border-border bg-secondary/40 p-4">
              <span className="font-serif font-bold text-[24px] text-primary">{item.year}</span>
              <span className="font-sans text-[15px] leading-relaxed text-foreground/90">{renderTextWithLinks(item.text)}</span>
            </div>
          ))}
        </div>
      );

    case 'checklist':
      return <ChecklistBlock items={block.items} moduleIndex={moduleIndex} />;

    case 'math':
      return (
        <div className={`mt-8 ${block.inline ? 'inline-block mx-2' : 'flex justify-center p-6 bg-card border border-border rounded-xl'}`}>
          {block.inline ? (
            <InlineMath math={block.expression} />
          ) : (
            <BlockMath math={block.expression} />
          )}
        </div>
      );

    case 'calculator':
      return <CalculatorBlock block={block} moduleIndex={moduleIndex} />;
      
    case 'breakeven-chart':
      return <BreakevenChartBlock block={block} />;
      
    case 'breakdown-chart':
      return <BreakdownChartBlock block={block} />;
      
    case 'comparison':
      return <ComparisonBlock block={block} />;
      
    case 'classify-exercise':
      return <ClassifyExerciseBlock block={block} moduleIndex={moduleIndex} />;
      
    case 'scenario-chart':
      return <ScenarioChartBlock block={block} />;
      
    default:
      return null;
  }
};
