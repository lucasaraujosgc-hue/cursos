export type Block =
  | { type: 'paragraph'; text: string }
  | { type: 'heading'; text: string }
  | { type: 'list'; items: string[] }
  | { type: 'callout'; title: string; items: string[] }
  | { type: 'highlight'; text: string }
  | { type: 'timeline'; items: { year: string; text: string }[] }
  | { type: 'checklist'; items: string[] };

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
