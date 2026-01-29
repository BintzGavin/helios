export interface TemplateFile {
  path: string;
  content: string;
}

export interface CompositionOptions {
  width: number;
  height: number;
  fps: number;
  duration: number;
}

export interface Template {
  id: string;
  label: string;
  generate: (name: string, options: CompositionOptions) => TemplateFile[];
}
