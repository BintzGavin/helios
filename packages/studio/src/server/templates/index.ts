import { vanillaTemplate } from './vanilla';
import { reactTemplate } from './react';
import { Template } from './types';

export const templates: Record<string, Template> = {
  vanilla: vanillaTemplate,
  react: reactTemplate
};

export type TemplateId = keyof typeof templates;
