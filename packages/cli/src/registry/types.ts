export interface ComponentFile {
  name: string;
  content: string;
}

export interface ComponentDefinition {
  name: string;
  type: 'react' | 'vue' | 'svelte' | 'vanilla';
  files: ComponentFile[];
  dependencies?: Record<string, string>;
}
