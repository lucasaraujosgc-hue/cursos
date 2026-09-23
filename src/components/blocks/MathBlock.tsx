/**
 * KaTeX ships its own fonts and stylesheet. Kept in a separate module so only
 * courses that actually use formulas pay for it.
 */
import React from 'react';
import { InlineMath, BlockMath } from 'react-katex';
import 'katex/dist/katex.min.css';

export default function MathBlock({ block }: { block: any }) {
  if (block.inline) {
    return (
      <span className="inline-block mx-2">
        <InlineMath math={block.expression} />
      </span>
    );
  }

  return (
    // Fórmula longa rola de lado em vez de estourar o card no celular.
    //
    // Sem flex de propósito: "justify-center" num container que rola centraliza
    // o conteúdo largo demais e joga o começo dele para fora do alcance da
    // rolagem. O KaTeX já centraliza sozinho quando a fórmula cabe.
    <div className="mt-8 p-4 sm:p-6 bg-card border border-border rounded-xl overflow-x-auto">
      <BlockMath math={block.expression} />
    </div>
  );
}
