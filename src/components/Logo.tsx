import React from 'react';

export default function Logo() {
  return (
    <div className="flex items-baseline select-none cursor-default">
      <span className="text-2xl md:text-[28px] font-serif font-bold text-primary tracking-tight">Vírgula</span>
      <span className="text-2xl md:text-[28px] font-serif font-bold text-accent leading-none">,</span>
      <span className="hidden md:inline font-sans text-[12px] font-medium text-muted-foreground tracking-[0.18em] uppercase ml-3">
        Contábil · Mini Curso
      </span>
    </div>
  );
}
