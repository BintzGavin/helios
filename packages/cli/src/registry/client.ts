import { registry as localRegistry } from './manifest.js';
import { ComponentDefinition, RemoteRegistryIndex, RemoteComponent } from './types.js';

export class RegistryClient {
  private url: string | undefined;
  private token: string | undefined;
  private cache: ComponentDefinition[] | null = null;
  private remoteCache: RemoteComponent[] | null = null;

  constructor(url?: string, token?: string) {
    this.url = url || process.env.HELIOS_REGISTRY_URL;
    this.token = token || process.env.HELIOS_REGISTRY_TOKEN;
  }

  private async fetch(url: string): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    try {
      const headers: HeadersInit = {};
      if (this.token) {
        headers['Authorization'] = `Bearer ${this.token}`;
      }
      return await fetch(url, { signal: controller.signal, headers });
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async getComponents(framework?: string): Promise<ComponentDefinition[]> {
    // Return cached full definitions if available
    if (this.cache) {
      return framework ? this.cache.filter(c => c.type === framework) : this.cache;
    }

    if (this.url) {
      try {
        const indexUrl = this.url.endsWith('.json') ? this.url : `${this.url.replace(/\/$/, '')}/index.json`;
        const res = await this.fetch(indexUrl);

        if (res.ok) {
          const data = await res.json();

          // New format: RemoteRegistryIndex
          if (data.version && Array.isArray(data.components)) {
            this.remoteCache = data.components;
            // Return placeholders for listing (files empty)
            const partials = this.remoteCache!.map(rc => ({
              ...rc,
              files: [] // Content missing, to be hydrated on install
            } as ComponentDefinition));

            return framework ? partials.filter(c => c.type === framework) : partials;
          }
          // Old format: ComponentDefinition[]
          else if (Array.isArray(data)) {
            this.cache = data as ComponentDefinition[];
            return framework ? this.cache.filter(c => c.type === framework) : this.cache;
          }
        }
      } catch (e) {
        console.warn('Failed to fetch remote registry (or timed out), falling back to local.');
      }
    }

    // Fallback to local registry
    this.cache = localRegistry;
    return framework ? this.cache.filter(c => c.type === framework) : this.cache;
  }

  async findComponent(name: string, framework?: string): Promise<ComponentDefinition | undefined> {
    // 1. Check full cache
    if (this.cache) {
      const found = this.cache.find(c => c.name === name && (!framework || c.type === framework));
      if (found) return found;
    }

    // 2. Check remote cache (and hydrate)
    if (this.remoteCache) {
      const found = this.remoteCache.find(c => c.name === name && (!framework || c.type === framework));
      if (found) return await this.hydrateComponent(found);
    }

    // 3. Force fetch if caches empty
    if (!this.cache && !this.remoteCache) {
      await this.getComponents(framework);

      // Re-check caches after fetch
      const newCache = this.cache as ComponentDefinition[] | null;
      if (newCache) {
        return newCache.find(c => c.name === name && (!framework || c.type === framework));
      }

      const newRemoteCache = this.remoteCache as RemoteComponent[] | null;
      if (newRemoteCache) {
        const found = newRemoteCache.find((c: RemoteComponent) => c.name === name && (!framework || c.type === framework));
        if (found) return await this.hydrateComponent(found);
      }
    }

    return undefined;
  }

  private async hydrateComponent(remote: RemoteComponent): Promise<ComponentDefinition> {
    const files: { name: string, content: string }[] = [];

    // Assume base URL is directory containing index.json
    // e.g. https://example.com/registry/index.json -> https://example.com/registry
    const baseUrl = this.url!.endsWith('.json')
      ? this.url!.substring(0, this.url!.lastIndexOf('/'))
      : this.url!.replace(/\/$/, '');

    for (const filePath of remote.files) {
      // url join
      const fileUrl = `${baseUrl}/${filePath}`;
      try {
        const res = await this.fetch(fileUrl);
        if (!res.ok) throw new Error(`Status ${res.status}`);
        const content = await res.text();
        files.push({ name: filePath, content });
      } catch (e) {
        throw new Error(`Failed to fetch file ${filePath} for component ${remote.name}: ${(e as Error).message}`);
      }
    }

    return {
      name: remote.name,
      description: remote.description,
      type: remote.type,
      files,
      dependencies: remote.dependencies,
      registryDependencies: remote.registryDependencies
    };
  }
}
