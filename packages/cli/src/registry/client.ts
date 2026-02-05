import { registry as localRegistry } from './manifest.js';
import { ComponentDefinition } from './types.js';

export class RegistryClient {
  private url: string | undefined;

  constructor(url?: string) {
    this.url = url || process.env.HELIOS_REGISTRY_URL;
  }

  async getComponents(): Promise<ComponentDefinition[]> {
    if (this.url) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        try {
          const res = await fetch(this.url, { signal: controller.signal });
          if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data)) {
               return data as ComponentDefinition[];
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
    return localRegistry;
  }

  async findComponent(name: string): Promise<ComponentDefinition | undefined> {
    const components = await this.getComponents();
    return components.find(c => c.name === name);
  }
}

export const defaultClient = new RegistryClient();
