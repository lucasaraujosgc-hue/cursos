export type Block =
  | { type: 'paragraph'; text: string }
  | { type: 'heading'; text: string }
  | { type: 'list'; items: string[] }
  | { type: 'callout'; title: string; items: string[] }
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
  | { type: 'scenario-chart'; custoFixo: number; custoVariavelUnitario: number; qtdMin: number; qtdMax: number };

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
};