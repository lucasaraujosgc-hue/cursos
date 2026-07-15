import React, { useState, useEffect } from 'react';
import { Block } from '../types';
import { InlineMath, BlockMath } from 'react-katex';
import 'katex/dist/katex.min.css';

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
                {item}
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
      return <p className="text-[17px] leading-relaxed text-foreground/90">{block.text}</p>;
    
    case 'heading':
      return <h2 className="font-serif font-semibold text-[20px] text-primary pt-2">{block.text}</h2>;
    
    case 'list':
      return (
        <ul className="space-y-3">
          {block.items.map((item, i) => (
            <li key={i} className="flex gap-3 items-baseline">
              <div className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
              <span className="text-[17px] leading-relaxed text-foreground/90">{item}</span>
            </li>
          ))}
        </ul>
      );
    
    case 'callout':
      return (
        <div className="rounded-xl border-l-4 border-accent bg-accent/10 p-5 mt-8">
          <h3 className="font-sans font-semibold uppercase text-[14px] tracking-wider text-accent-foreground/80 mb-3">
            {block.title}
          </h3>
          <ul className="space-y-2.5">
            {block.items.map((item, i) => (
              <li key={i} className="flex gap-2.5 items-baseline">
                <span className="text-accent text-sm">•</span>
                <span className="text-[15px] text-foreground/90">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      );
    
    case 'highlight':
      return (
        <div className="border-l-4 border-primary bg-primary/5 px-5 py-4 mt-8">
          <p className="text-[17px] italic text-primary leading-relaxed">{block.text}</p>
        </div>
      );
    
    case 'timeline':
      return (
        <div className="space-y-3 mt-8">
          {block.items.map((item, i) => (
            <div key={i} className="grid grid-cols-[90px_1fr] items-start gap-4 rounded-lg border border-border bg-secondary/40 p-4">
              <span className="font-serif font-bold text-[24px] text-primary">{item.year}</span>
              <span className="font-sans text-[15px] leading-relaxed text-foreground/90">{item.text}</span>
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
      
    default:
      return null;
  }
};
