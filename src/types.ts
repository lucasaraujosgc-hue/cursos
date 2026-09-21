export type Block =
  | { type: 'paragraph'; text: string }
  | { type: 'heading'; text: string }
  | { type: 'list'; items: string[] }
  | { type: 'callout'; title: string; items: string[]; tone?: 'info' | 'warning' | 'danger' | 'success' }
  | { type: 'highlight'; text: string }
  | { type: 'timeline'; items: { year: string; text: string }[] }
  | { type: 'checklist'; items: string[] }
  | { type: 'math'; expression: string; inline?: boolean }
  | {
      type: 'calculator';
      fields: { id: string; label: string; type: 'number' | 'currency' | 'percentage' | 'select' | 'text'; placeholder?: string; options?: string[] }[];
      formula: string;
      resultLabel: string;
      resultFormat?: 'currency' | 'number' | 'percentage' | 'object';
      // Only used when resultFormat === 'object'. The formula's return object's keys are matched
      // against `key` here to pick a label + display format. Any returned key not listed here
      // falls back to a humanized version of the key name, formatted as a plain number.
      // A returned key named "aviso" is always treated as a full-width warning message.
      resultFields?: { key: string; label: string; format?: 'currency' | 'number' | 'percentage' | 'text' }[];
    }
  | { type: 'breakeven-chart'; custoFixo: number; custoVariavelUnitario: number; precoVenda: number; quantidadeMaxima?: number }
  | { type: 'breakdown-chart'; total: number; parts: { label: string; value: number; color?: string }[] }
  | { type: 'comparison'; columns: { label: string; tone: 'negative' | 'positive' | 'neutral'; items: string[] }[] }
  | { type: 'classify-exercise'; items: string[]; categories: string[]; answerKey: Record<string, string> }
  | { type: 'scenario-chart'; custoFixo: number; custoVariavelUnitario: number; qtdMin: number; qtdMax: number }
  // Multiple-choice question. `correct` is the 0-based index into `options`.
  | { type: 'quiz'; question: string; options: string[]; correct: number; explanation?: string }
  // Collapsed by default: good for FAQs and for long detail the reader can skip.
  | { type: 'accordion'; items: { title: string; text: string }[] }
  // Scrolls horizontally on narrow screens instead of squashing the columns.
  | { type: 'table'; headers: string[]; rows: string[][]; caption?: string }
  // Numbered walkthrough ("faça isto, depois isto").
  | { type: 'steps'; items: { title: string; text?: string }[] }
  // Big numbers. Each card is one figure plus its label.
  | { type: 'stats'; items: { value: string; label: string; hint?: string }[] }
  // YouTube or Vimeo. `url` accepts the normal watch/share link.
  | { type: 'video'; url: string; caption?: string }
  | { type: 'image'; url: string; alt?: string; caption?: string }
  | { type: 'quote'; text: string; author?: string; role?: string }
  | { type: 'divider' }
  // In-course call to action (an external link, e.g. a calculator or a form).
  | { type: 'cta'; text: string; buttonLabel: string; url: string };

export type Module = {
  id: string;
  shortTitle: string;
  kicker: string;
  title: string;
  summary: string;
  content: Block[];
};

export type Course = {
  slug: string;
  courseName: string;
  description: string;
  modules: Module[];
  /**
   * Where the course asks for the visitor's name and phone.
   *  - 'end'  (default) the content is open; the ask sits at the end, in the
   *           "dúvida ou sugestão" card, where the visitor already got value.
   *  - 'none' never asks.
   *  - 'start' the old behaviour: a form before the first module. Costs a lot
   *           of traffic from social, kept only as an escape hatch.
   */
  leadCapture?: 'end' | 'none' | 'start';
  /** Absolute URL used for the link preview on WhatsApp/Instagram (1200x630). */
  ogImage?: string;
};
