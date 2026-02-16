export interface ComponentFile {
  name: string;
  content: string;
}

export interface ComponentDefinition {
  name: string;
  description?: string;
  type: 'react' | 'vue' | 'svelte' | 'solid' | 'vanilla';
  files: ComponentFile[];
  dependencies?: Record<string, string>;
  registryDependencies?: string[];
}

export interface RemoteRegistryIndex {
  version: string;
  components: RemoteComponent[];
}

export interface RemoteComponent {
  name: string;
  description: string;
  type: 'react' | 'vue' | 'svelte' | 'solid' | 'vanilla';
  files: string[];
  dependencies?: Record<string, string>;
  registryDependencies?: string[];
}
