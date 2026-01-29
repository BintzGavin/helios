import { vanillaTemplate } from './vanilla';
import { reactTemplate } from './react';
import { vueTemplate } from './vue';
import { svelteTemplate } from './svelte';
import { Template } from './types';

export const templates: Record<string, Template> = {
  vanilla: vanillaTemplate,
  react: reactTemplate,
  vue: vueTemplate,
  svelte: svelteTemplate
};

export type TemplateId = keyof typeof templates;
