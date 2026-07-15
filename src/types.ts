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
      fields: { id: string; label: string; type: 'number' | 'currency' | 'percentage'; placeholder?: string }[];
      formula: string; 
      resultLabel: string;
      resultFormat?: 'currency' | 'number' | 'percentage';
    };

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
