import React from 'react';
import { Link } from 'react-router-dom';

export default function Logo() {
  return (
    <div className="flex items-center gap-4">
      <Link to="/" className="flex items-center gap-3 select-none cursor-pointer hover:opacity-80 transition-opacity">
        <div className="flex flex-col items-center">
          <div className="flex items-baseline">
            <span className="text-2xl md:text-[28px] font-serif font-bold text-primary tracking-tight">Vírgula</span>
            <span className="text-2xl md:text-[28px] font-serif font-bold text-accent leading-none">,</span>
          </div>
          <span className="font-sans text-[10px] md:text-[11px] font-normal text-muted-foreground tracking-[0.3em] uppercase leading-none mt-0.5 ml-[0.3em]">
            Contábil
          </span>
        </div>
        <div className="hidden md:flex items-center pl-3 border-l border-border h-8">
          <span className="font-sans text-[12px] font-medium text-muted-foreground tracking-[0.18em] uppercase">
            Mini Curso
          </span>
        </div>
      </Link>
      <a 
        href="https://calculadora.virgulacontabil.com.br" 
        target="_blank" 
        rel="noopener noreferrer"
        className="hidden md:flex items-center justify-center bg-accent text-accent-foreground hover:bg-accent/90 px-4 py-2 rounded-full text-xs font-medium tracking-wide shadow-sm hover:shadow-md transition-all duration-300 ease-in-out"
      >
        Calculadora
      </a>
    </div>
  );
}
