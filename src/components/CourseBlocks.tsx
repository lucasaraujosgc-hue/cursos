import React, { useState, useEffect } from 'react';
import { Block } from '../types';

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
      
    default:
      return null;
  }
};
