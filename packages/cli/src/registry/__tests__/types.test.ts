import { describe, it, expect } from 'vitest';
import type {
  ComponentFile,
  ComponentDefinition,
  RemoteRegistryIndex,
  RemoteComponent
} from '../types.js';

describe('Registry Types', () => {
  it('ComponentFile structure', () => {
    const file: ComponentFile = {
      name: 'index.tsx',
      content: 'export default () => <div>Hello</div>;'
    };

    expect(file).toBeDefined();
    expect(file.name).toBe('index.tsx');
    expect(file.content).toBe('export default () => <div>Hello</div>;');
  });

  it('ComponentDefinition structure', () => {
    const component: ComponentDefinition = {
      name: 'Button',
      description: 'A simple button component',
      type: 'react',
      files: [
        {
          name: 'Button.tsx',
          content: 'export const Button = () => <button>Click me</button>;'
        }
      ],
      dependencies: {
        'react': '^18.2.0'
      },
      registryDependencies: ['utils']
    };

    expect(component).toBeDefined();
    expect(component.name).toBe('Button');
    expect(component.description).toBe('A simple button component');
    expect(component.type).toBe('react');
    expect(component.files.length).toBe(1);
    expect(component.dependencies).toEqual({ 'react': '^18.2.0' });
    expect(component.registryDependencies).toEqual(['utils']);
  });

  it('RemoteComponent structure', () => {
    const remoteComponent: RemoteComponent = {
      name: 'Card',
      description: 'A flexible card component',
      type: 'vue',
      files: ['Card.vue'],
      dependencies: {
        'vue': '^3.3.0'
      },
      registryDependencies: ['styles']
    };

    expect(remoteComponent).toBeDefined();
    expect(remoteComponent.name).toBe('Card');
    expect(remoteComponent.description).toBe('A flexible card component');
    expect(remoteComponent.type).toBe('vue');
    expect(remoteComponent.files.length).toBe(1);
    expect(remoteComponent.dependencies).toEqual({ 'vue': '^3.3.0' });
    expect(remoteComponent.registryDependencies).toEqual(['styles']);
  });

  it('RemoteRegistryIndex structure', () => {
    const registryIndex: RemoteRegistryIndex = {
      version: '1.0.0',
      components: [
        {
          name: 'Button',
          description: 'A simple button component',
          type: 'react',
          files: ['Button.tsx']
        }
      ]
    };

    expect(registryIndex).toBeDefined();
    expect(registryIndex.version).toBe('1.0.0');
    expect(registryIndex.components.length).toBe(1);
    expect(registryIndex.components[0].name).toBe('Button');
  });
});
