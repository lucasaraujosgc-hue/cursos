import React, { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { Block } from '../types';

// Charts (recharts) and formulas (KaTeX) are the two heavy dependencies here.
// Loading them on demand keeps the first paint of a text-only module small,
// which is what most visitors coming from Instagram on mobile data will hit.
const Charts = {
  Breakeven: lazy(() => import('./blocks/Charts').then(m => ({ default: m.BreakevenChartBlock }))),
  Breakdown: lazy(() => import('./blocks/Charts').then(m => ({ default: m.BreakdownChartBlock }))),
  Scenario: lazy(() => import('./blocks/Charts').then(m => ({ default: m.ScenarioChartBlock }))),
};
const MathBlock = lazy(() => import('./blocks/MathBlock'));

const LazyFallback = ({ height }: { height: string }) => (
  <div className={`mt-8 w-full ${height} rounded-xl border border-border bg-secondary/30 animate-pulse`} />
);

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
                  let btnClass = "px-4 py-2.5 min-h-[44px] rounded-md text-sm font-medium border transition-colors ";
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

// Turns "aliquotaEfetiva" into "Aliquota Efetiva" for keys the course JSON didn't
// explicitly label via `resultFields`.
const humanizeKey = (key: string) => key
  .replace(/([A-Z])/g, ' $1')
  .replace(/^./, (s: string) => s.toUpperCase())
  .trim();

// A calculator's `formula` can be either a bare expression ("a * b / 100", the
// original/simple case) or a multi-statement function body that already ends
// in its own `return` (used by calculators with resultFormat: 'object', e.g.
// "const base = ...; const inss = ...; return { base, inss };"). Blindly
// prefixing every formula with `return ` breaks the second case with a
// SyntaxError, so detect which kind it is before building the Function.
const buildCalculatorFn = (keys: string[], formula: string) => {
  const trimmed = (formula || '').trim();
  const isStatementBlock = /;|\breturn\b/.test(trimmed);
  const body = isStatementBlock ? trimmed : `return ${trimmed};`;
  return new Function(...keys, body);
};

const formatByType = (val: any, format?: string) => {
  if (typeof val === 'string') return val;
  if (typeof val !== 'number' || isNaN(val)) return String(val ?? '—');
  if (format === 'currency') return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  if (format === 'percentage') return val.toLocaleString('pt-BR', { maximumFractionDigits: 2 }) + '%';
  return val.toLocaleString('pt-BR', { maximumFractionDigits: 2 });
};

// Renders the multi-value result of a calculator whose formula returns an object
// instead of a single number (resultFormat: 'object'). If the object contains an
// "aviso" key, that takes over as a single full-width warning message instead of
// the usual result grid — used for out-of-range / edge-case messages.
const CalculatorObjectResult = ({ block, result }: { block: any; result: Record<string, any> }) => {
  if (typeof result.aviso === 'string') {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-[15px] leading-relaxed text-amber-900">
        {result.aviso}
      </div>
    );
  }

  const resultFields: { key: string; label: string; format?: string }[] = block.resultFields || [];

  return (
    <div>
      {block.resultLabel && (
        <span className="block font-sans font-medium text-muted-foreground mb-3">{block.resultLabel}</span>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {Object.keys(result).map((key) => {
          const fieldDef = resultFields.find((r) => r.key === key);
          const label = fieldDef?.label || humanizeKey(key);
          const display = formatByType(result[key], fieldDef?.format);
          return (
            <div key={key} className="rounded-lg border border-primary/20 bg-primary/5 p-3 flex flex-col">
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
              <span className="font-serif font-bold text-lg text-primary">{display}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const CalculatorBlock = ({ block, moduleIndex }: { block: any, moduleIndex: number }) => {
  const [values, setValues] = useState<Record<string, any>>({});

  useEffect(() => {
    const initVals: Record<string, any> = {};
    if (block.fields) {
      block.fields.forEach((f: any) => {
        if (f.type === 'select' && f.options && f.options.length > 0) {
          initVals[f.id] = f.options[0];
        }
      });
    }
    setValues(initVals);
  }, [moduleIndex, block.fields]);

  const handleChange = (id: string, val: string, type: string) => {
    if (type === 'select' || type === 'text') {
      setValues(prev => ({ ...prev, [id]: val }));
    } else {
      const num = parseFloat(val.replace(',', '.'));
      setValues(prev => ({ ...prev, [id]: isNaN(num) ? 0 : num }));
    }
  };

  const isObjectResult = block.resultFormat === 'object';

  let numericResult = 0;
  let objectResult: Record<string, any> | null = null;
  try {
    const keys = Object.keys(values);
    const args = keys.map(k => values[k]);
    // Allow basic formula execution with given field IDs
    const func = buildCalculatorFn(keys, block.formula);
    const raw = func(...args);
    if (isObjectResult) {
      objectResult = raw && typeof raw === 'object' ? raw : null;
    } else {
      numericResult = raw || 0;
    }
  } catch (err) {
    // Ignore invalid formulas during typing or if incomplete
  }

  const formatResult = (val: number) => {
    if (block.resultFormat === 'currency') return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    if (block.resultFormat === 'percentage') return val.toLocaleString('pt-BR', { maximumFractionDigits: 2 }) + '%';
    if (block.resultFormat === 'number') return val.toLocaleString('pt-BR', { maximumFractionDigits: 2 });
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
              
              {f.type === 'select' ? (
                <select
                  value={values[f.id] || ''}
                  onChange={(e) => handleChange(f.id, e.target.value, f.type)}
                  className="w-full p-3 min-h-[48px] text-[16px] rounded-lg border border-border bg-background focus:outline-none focus:border-primary appearance-none"
                >
                  {f.options?.map((opt: string) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              ) : (
                <input
                  type="number"
                  step="any"
                  inputMode="decimal"
                  placeholder={f.placeholder}
                  onChange={(e) => handleChange(f.id, e.target.value, f.type)}
                  /* text-[16px]: anything smaller makes iOS Safari zoom in on focus. */
                  className={`w-full p-3 min-h-[48px] text-[16px] rounded-lg border border-border bg-background focus:outline-none focus:border-primary ${f.type === 'currency' ? 'pl-9' : ''}`}
                />
              )}
              {f.type === 'percentage' && <span className="absolute right-3 top-2.5 text-muted-foreground">%</span>}
              {f.type === 'select' && (
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground">
                  <svg className="h-4 w-4 fill-current" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                    <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
                  </svg>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {isObjectResult ? (
        objectResult ? (
          <CalculatorObjectResult block={block} result={objectResult} />
        ) : (
          <div className="rounded-lg border border-border bg-secondary/40 p-4 text-center text-sm text-muted-foreground">
            Preencha os campos acima para ver o resultado da simulação.
          </div>
        )
      ) : (
        <div className="bg-primary/5 rounded-lg p-4 flex flex-col sm:flex-row items-center justify-between border border-primary/20">
          <span className="font-sans font-medium text-muted-foreground">{block.resultLabel}</span>
          <span className="font-serif font-bold text-2xl text-primary">{formatResult(numericResult)}</span>
        </div>
      )}
    </div>
  );
};

export const QuizBlock = ({ block, moduleIndex }: { block: any, moduleIndex: number }) => {
  const [picked, setPicked] = useState<number | null>(null);

  useEffect(() => {
    setPicked(null);
  }, [moduleIndex, block.question]);

  const answered = picked !== null;
  const isRight = picked === block.correct;

  return (
    <div className="rounded-xl border border-border bg-card p-5 sm:p-6 mt-8 shadow-sm">
      <div className="font-sans font-semibold uppercase text-[11px] tracking-[0.14em] text-accent mb-3">
        Pergunta rápida
      </div>
      <p className="text-[17px] font-medium leading-relaxed text-foreground mb-5">
        {renderTextWithLinks(block.question)}
      </p>

      <div className="space-y-2.5">
        {block.options.map((opt: string, i: number) => {
          let cls = 'w-full flex items-start gap-3 text-left p-3.5 min-h-[52px] rounded-lg border transition-colors ';
          if (!answered) {
            cls += 'border-border bg-background hover:border-primary/40 active:bg-secondary';
          } else if (i === block.correct) {
            cls += 'border-emerald-500 bg-emerald-50 text-emerald-900';
          } else if (i === picked) {
            cls += 'border-red-400 bg-red-50 text-red-900';
          } else {
            cls += 'border-border bg-background opacity-50';
          }

          return (
            <button key={i} disabled={answered} onClick={() => setPicked(i)} className={cls}>
              <span className="mt-0.5 h-5 w-5 shrink-0 rounded-full border border-current/30 text-[11px] font-bold flex items-center justify-center">
                {answered && i === block.correct ? '✓' : answered && i === picked ? '✕' : String.fromCharCode(65 + i)}
              </span>
              <span className="text-[15px] leading-relaxed">{renderTextWithLinks(opt)}</span>
            </button>
          );
        })}
      </div>

      {answered && (
        <div className="mt-5 space-y-3">
          <div className={`font-serif font-semibold text-[17px] ${isRight ? 'text-emerald-600' : 'text-primary'}`}>
            {isRight ? 'Isso mesmo!' : 'Quase — veja o porquê:'}
          </div>
          {block.explanation && (
            <p className="text-[15px] leading-relaxed text-muted-foreground">
              {renderTextWithLinks(block.explanation)}
            </p>
          )}
          <button
            onClick={() => setPicked(null)}
            className="text-sm font-medium text-primary underline underline-offset-4"
          >
            Responder de novo
          </button>
        </div>
      )}
    </div>
  );
};

export const AccordionBlock = ({ block }: { block: any }) => {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <div className="mt-8 rounded-xl border border-border bg-card divide-y divide-border overflow-hidden">
      {block.items.map((item: any, i: number) => {
        const isOpen = open === i;
        return (
          <div key={i}>
            <button
              onClick={() => setOpen(isOpen ? null : i)}
              className="w-full flex items-center justify-between gap-4 p-4 min-h-[56px] text-left hover:bg-secondary/40 transition-colors"
            >
              <span className="text-[16px] font-medium text-foreground">{item.title}</span>
              <span className={`shrink-0 text-muted-foreground transition-transform duration-200 ${isOpen ? 'rotate-45' : ''}`}>
                ＋
              </span>
            </button>
            {isOpen && (
              <div className="px-4 pb-4 -mt-1">
                <p className="text-[15px] leading-relaxed text-muted-foreground">
                  {renderTextWithLinks(item.text)}
                </p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export const TableBlock = ({ block }: { block: any }) => {
  const rolagemRef = useRef<HTMLDivElement>(null);
  const [rola, setRola] = useState(false);
  const colunas = block.headers?.length ?? 0;

  // Largura mínima proporcional ao número de colunas. Uma mínima fixa fazia
  // até a tabela de duas colunas rolar, e num celular de 390px isso escondia
  // justamente a coluna do valor — a que a tabela existe para mostrar.
  const larguraMinima = colunas > 2 ? Math.min(560, colunas * 130) : undefined;

  // Só avisa para arrastar quando a tabela realmente não cabe.
  useEffect(() => {
    const el = rolagemRef.current;
    if (!el) return;
    const mede = () => setRola(el.scrollWidth > el.clientWidth + 4);
    mede();
    const observer = new ResizeObserver(mede);
    observer.observe(el);
    // A tabela também: o container é sempre da largura da tela, então quando a
    // fonte termina de carregar e as colunas crescem, só ela muda de tamanho.
    if (el.firstElementChild) observer.observe(el.firstElementChild);
    return () => observer.disconnect();
  }, [colunas, block.rows?.length]);

  return (
  <figure className="mt-8">
    <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
      {/* Narrow screens scroll the table sideways rather than squashing the columns. */}
      <div ref={rolagemRef} className="overflow-x-auto -webkit-overflow-scrolling-touch">
        <table className="w-full text-left border-collapse" style={larguraMinima ? { minWidth: larguraMinima } : undefined}>
          <thead className="bg-secondary/50">
            <tr>
              {block.headers.map((h: string, i: number) => (
                <th key={i} className="p-3 text-[13px] font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {block.rows.map((row: string[], i: number) => (
              <tr key={i} className="align-top">
                {row.map((cell, j) => (
                  <td key={j} className={`p-3 text-[15px] leading-relaxed ${j === 0 ? 'font-medium text-foreground' : 'text-foreground/85'}`}>
                    {renderTextWithLinks(cell)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
    {(block.caption || rola) && (
      <figcaption className="mt-2 text-[13px] text-muted-foreground">
        {block.caption
          ? rola ? `${block.caption} · arraste a tabela para o lado` : block.caption
          : 'Arraste a tabela para o lado'}
      </figcaption>
    )}
  </figure>
  );
};

export const StepsBlock = ({ block }: { block: any }) => (
  <ol className="mt-8 space-y-3">
    {block.items.map((item: any, i: number) => (
      <li key={i} className="flex gap-4 rounded-xl border border-border bg-card p-4">
        <span className="h-8 w-8 shrink-0 rounded-full bg-primary text-primary-foreground font-serif font-bold text-[15px] flex items-center justify-center">
          {i + 1}
        </span>
        <div className="min-w-0">
          <div className="text-[16px] font-semibold text-foreground leading-snug">{item.title}</div>
          {item.text && (
            <p className="mt-1 text-[15px] leading-relaxed text-muted-foreground">{renderTextWithLinks(item.text)}</p>
          )}
        </div>
      </li>
    ))}
  </ol>
);

export const StatsBlock = ({ block }: { block: any }) => (
  <div className="mt-8 grid grid-cols-2 lg:grid-cols-3 gap-3">
    {block.items.map((item: any, i: number) => (
      <div key={i} className="rounded-xl border border-border bg-card p-4">
        <div className="font-serif font-bold text-[26px] sm:text-[30px] text-primary leading-none tracking-tight">
          {item.value}
        </div>
        <div className="mt-2 text-[13px] font-medium text-foreground/90 leading-snug">{item.label}</div>
        {item.hint && <div className="mt-1 text-[12px] text-muted-foreground leading-snug">{item.hint}</div>}
      </div>
    ))}
  </div>
);

// Accepts the shapes people actually paste: youtu.be/ID, watch?v=ID, /embed/ID,
// /shorts/ID and vimeo.com/ID. Anything else renders as a plain link.
const toEmbedUrl = (url: string): string | null => {
  if (!url) return null;
  const yt = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{6,})/);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
  const vimeo = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`;
  return null;
};

export const VideoBlock = ({ block }: { block: any }) => {
  const embed = toEmbedUrl(block.url);

  if (!embed) {
    return (
      <p className="mt-8 text-[15px]">
        <a href={block.url} target="_blank" rel="noopener noreferrer" className="text-primary underline font-medium">
          Assistir ao vídeo
        </a>
      </p>
    );
  }

  return (
    <figure className="mt-8">
      <div className="relative w-full overflow-hidden rounded-xl border border-border bg-black aspect-video">
        <iframe
          src={embed}
          title={block.caption || 'Vídeo do módulo'}
          loading="lazy"
          allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="absolute inset-0 h-full w-full"
        />
      </div>
      {block.caption && <figcaption className="mt-2 text-[13px] text-muted-foreground">{block.caption}</figcaption>}
    </figure>
  );
};

export const ImageBlock = ({ block }: { block: any }) => (
  <figure className="mt-8">
    <img
      src={block.url}
      alt={block.alt || block.caption || ''}
      loading="lazy"
      className="w-full rounded-xl border border-border bg-card"
    />
    {block.caption && <figcaption className="mt-2 text-[13px] text-muted-foreground">{block.caption}</figcaption>}
  </figure>
);

export const QuoteBlock = ({ block }: { block: any }) => (
  <figure className="mt-8 rounded-xl border border-border bg-secondary/30 p-5 sm:p-6">
    <blockquote className="font-serif text-[19px] sm:text-[21px] leading-relaxed text-primary">
      “{block.text}”
    </blockquote>
    {(block.author || block.role) && (
      <figcaption className="mt-3 text-[13px] text-muted-foreground">
        {block.author}
        {block.author && block.role ? ' · ' : ''}
        {block.role}
      </figcaption>
    )}
  </figure>
);

export const CtaBlock = ({ block }: { block: any }) => (
  <div className="mt-8 rounded-xl border border-primary/20 bg-primary/5 p-5 flex flex-col sm:flex-row sm:items-center gap-4">
    <p className="text-[16px] leading-relaxed text-foreground/90 flex-1">{block.text}</p>
    <a
      href={block.url}
      target="_blank"
      rel="noopener noreferrer"
      className="shrink-0 inline-flex items-center justify-center bg-primary text-primary-foreground px-5 py-3 min-h-[48px] rounded-lg text-[15px] font-semibold shadow-sm hover:opacity-90 transition-opacity"
    >
      {block.buttonLabel}
    </a>
  </div>
);

const CALLOUT_TONES: Record<string, { wrap: string; title: string; bullet: string }> = {
  info: { wrap: 'border-accent bg-accent/10', title: 'text-accent-foreground/80', bullet: 'text-accent' },
  warning: { wrap: 'border-amber-400 bg-amber-50', title: 'text-amber-800', bullet: 'text-amber-600' },
  danger: { wrap: 'border-red-400 bg-red-50', title: 'text-red-800', bullet: 'text-red-500' },
  success: { wrap: 'border-emerald-500 bg-emerald-50', title: 'text-emerald-800', bullet: 'text-emerald-600' },
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
    
    case 'callout': {
      const tone = CALLOUT_TONES[block.tone || 'info'] || CALLOUT_TONES.info;
      return (
        <div className={`rounded-xl border-l-4 p-5 mt-8 ${tone.wrap}`}>
          <h3 className={`font-sans font-semibold uppercase text-[14px] tracking-wider mb-3 ${tone.title}`}>
            {renderTextWithLinks(block.title)}
          </h3>
          <ul className="space-y-2.5">
            {block.items.map((item, i) => (
              <li key={i} className="flex gap-2.5 items-baseline">
                <span className={`text-sm ${tone.bullet}`}>•</span>
                <span className="text-[15px] leading-relaxed text-foreground/90">{renderTextWithLinks(item)}</span>
              </li>
            ))}
          </ul>
        </div>
      );
    }
    
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
            <div key={i} className="grid grid-cols-[64px_1fr] sm:grid-cols-[90px_1fr] items-start gap-3 sm:gap-4 rounded-lg border border-border bg-secondary/40 p-4">
              <span className="font-serif font-bold text-[20px] sm:text-[24px] text-primary">{item.year}</span>
              <span className="font-sans text-[15px] leading-relaxed text-foreground/90">{renderTextWithLinks(item.text)}</span>
            </div>
          ))}
        </div>
      );

    case 'checklist':
      return <ChecklistBlock items={block.items} moduleIndex={moduleIndex} />;

    case 'math':
      return (
        <Suspense fallback={<LazyFallback height="h-20" />}>
          <MathBlock block={block} />
        </Suspense>
      );

    case 'calculator':
      return <CalculatorBlock block={block} moduleIndex={moduleIndex} />;
      
    case 'breakeven-chart':
      return (
        <Suspense fallback={<LazyFallback height="h-[300px]" />}>
          <Charts.Breakeven block={block} />
        </Suspense>
      );

    case 'breakdown-chart':
      return (
        <Suspense fallback={<LazyFallback height="h-[320px]" />}>
          <Charts.Breakdown block={block} />
        </Suspense>
      );

    case 'comparison':
      return <ComparisonBlock block={block} />;

    case 'classify-exercise':
      return <ClassifyExerciseBlock block={block} moduleIndex={moduleIndex} />;

    case 'scenario-chart':
      return (
        <Suspense fallback={<LazyFallback height="h-[300px]" />}>
          <Charts.Scenario block={block} />
        </Suspense>
      );

    case 'quiz':
      return <QuizBlock block={block} moduleIndex={moduleIndex} />;

    case 'accordion':
      return <AccordionBlock block={block} />;

    case 'table':
      return <TableBlock block={block} />;

    case 'steps':
      return <StepsBlock block={block} />;

    case 'stats':
      return <StatsBlock block={block} />;

    case 'video':
      return <VideoBlock block={block} />;

    case 'image':
      return <ImageBlock block={block} />;

    case 'quote':
      return <QuoteBlock block={block} />;

    case 'cta':
      return <CtaBlock block={block} />;

    case 'divider':
      return <hr className="mt-8 border-t border-border" />;

    default:
      return null;
  }
};
