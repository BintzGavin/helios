import { vanillaTemplate } from './vanilla';
import { reactTemplate } from './react';
import { vueTemplate } from './vue';
import { svelteTemplate } from './svelte';
import { solidTemplate } from './solid';
import { threejsTemplate } from './threejs';
import { Template } from './types';
import { titleExplainerTemplate } from './title-explainer';

export const templates: Record<string, Template> = {
  'title-explainer': titleExplainerTemplate,
  vanilla: vanillaTemplate,
  react: reactTemplate,
  vue: vueTemplate,
  svelte: svelteTemplate,
  solid: solidTemplate,
  threejs: threejsTemplate
};

export type TemplateId = keyof typeof templates;
