export interface Prompt {
  id: number;
  title: string;
  summary?: string;
  content?: string;
  version?: string;
  created_at?: string;
  excontext?: string;
}

export interface StructureItem {
  type: 'module' | 'flow';
  content: string;
  line: number;
}
