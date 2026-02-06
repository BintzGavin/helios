import { registry as localRegistry } from './manifest.js';
import { ComponentDefinition } from './types.js';

export class RegistryClient {
  private url: string | undefined;

  constructor(url?: string) {
    this.url = url || process.env.HELIOS_REGISTRY_URL;
  }

  async getComponents(framework?: string): Promise<ComponentDefinition[]> {
    let components = localRegistry;

    if (this.url) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        try {
          const res = await fetch(this.url, { signal: controller.signal });
          if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data)) {
               components = data as ComponentDefinition[];
            } else {
               console.warn('Remote registry response is not an array, falling back to local.');
            }
          }
        } finally {
          clearTimeout(timeoutId);
        }
      } catch (e) {
        console.warn('Failed to fetch remote registry (or timed out), falling back to local.');
      }
    }

    if (framework) {
      return components.filter(c => c.type === framework);
    }
    return components;
  }

  async findComponent(name: string, framework?: string): Promise<ComponentDefinition | undefined> {
    const components = await this.getComponents(framework);
    return components.find(c => c.name === name);
  }
}

export const defaultClient = new RegistryClient();
