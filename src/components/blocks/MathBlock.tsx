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
    // Long formulas scroll sideways instead of overflowing the card on a phone.
    <div className="mt-8 flex justify-center p-4 sm:p-6 bg-card border border-border rounded-xl overflow-x-auto">
      <BlockMath math={block.expression} />
    </div>
  );
}
