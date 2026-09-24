import { describe, it, expect } from 'vitest';
import type { ComponentFile, ComponentDefinition, RemoteRegistryIndex, RemoteComponent } from '../types.js';

describe('Registry Types', () => {
  it('should validate ComponentFile structure', () => {
    const file: ComponentFile = {
      name: 'index.tsx',
      content: 'console.log("hello");',
    };

    expect(file).toBeDefined();
    expect(file.name).toBe('index.tsx');
    expect(file.content).toBe('console.log("hello");');
  });

  it('should validate ComponentDefinition structure', () => {
    const component: ComponentDefinition = {
      name: 'my-component',
      description: 'A test component',
      type: 'react',
      files: [
        {
          name: 'index.tsx',
          content: 'export default () => <div>Hello</div>',
        },
      ],
      dependencies: {
        'react': '^18.0.0',
      },
      registryDependencies: ['other-component'],
    };

    expect(component).toBeDefined();
    expect(component.name).toBe('my-component');
    expect(component.description).toBe('A test component');
    expect(component.type).toBe('react');
    expect(component.files).toHaveLength(1);
    expect(component.files[0].name).toBe('index.tsx');
    expect(component.dependencies).toEqual({ react: '^18.0.0' });
    expect(component.registryDependencies).toEqual(['other-component']);
  });

  it('should validate ComponentDefinition minimal structure', () => {
    const component: ComponentDefinition = {
      name: 'minimal-component',
      type: 'vue',
      files: [],
    };

    expect(component).toBeDefined();
    expect(component.name).toBe('minimal-component');
    expect(component.type).toBe('vue');
    expect(component.files).toHaveLength(0);
    expect(component.description).toBeUndefined();
    expect(component.dependencies).toBeUndefined();
    expect(component.registryDependencies).toBeUndefined();
  });

  it('should validate RemoteComponent structure', () => {
    const remoteComponent: RemoteComponent = {
      name: 'remote-comp',
      description: 'A remote component',
      type: 'svelte',
      files: ['index.svelte', 'utils.js'],
      dependencies: {
        'svelte': '^4.0.0',
      },
      registryDependencies: ['shared-lib'],
    };

    expect(remoteComponent).toBeDefined();
    expect(remoteComponent.name).toBe('remote-comp');
    expect(remoteComponent.description).toBe('A remote component');
    expect(remoteComponent.type).toBe('svelte');
    expect(remoteComponent.files).toHaveLength(2);
    expect(remoteComponent.files[0]).toBe('index.svelte');
    expect(remoteComponent.dependencies).toEqual({ svelte: '^4.0.0' });
    expect(remoteComponent.registryDependencies).toEqual(['shared-lib']);
  });

  it('should validate RemoteRegistryIndex structure', () => {
    const index: RemoteRegistryIndex = {
      version: '1.0.0',
      components: [
        {
          name: 'comp1',
          description: 'Desc 1',
          type: 'solid',
          files: ['index.tsx'],
        },
        {
          name: 'comp2',
          description: 'Desc 2',
          type: 'vanilla',
          files: ['index.js'],
        },
      ],
    };

    expect(index).toBeDefined();
    expect(index.version).toBe('1.0.0');
    expect(index.components).toHaveLength(2);
    expect(index.components[0].name).toBe('comp1');
    expect(index.components[0].type).toBe('solid');
    expect(index.components[1].name).toBe('comp2');
    expect(index.components[1].type).toBe('vanilla');
  });
});
