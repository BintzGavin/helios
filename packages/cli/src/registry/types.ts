export interface ComponentFile {
  name: string;
  content: string;
}

export interface ComponentDefinition {
  name: string;
  description?: string;
  type: 'react' | 'vue' | 'svelte' | 'vanilla';
  files: ComponentFile[];
  dependencies?: Record<string, string>;
}
