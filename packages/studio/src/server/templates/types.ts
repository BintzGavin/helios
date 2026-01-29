export interface TemplateFile {
  path: string;
  content: string;
}

export interface Template {
  id: string;
  label: string;
  generate: (name: string) => TemplateFile[];
}
