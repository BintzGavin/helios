import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { z } from "zod";
import { findCompositions, createComposition, findAssets } from './discovery';
import { startRender } from './render-manager';
import { StudioPluginOptions } from './types';
import { findDocumentation } from './documentation';

export function createMcpServer(getPort: () => number, options: StudioPluginOptions = {}) {
  const server = new McpServer({
    name: "Helios Studio",
    version: "0.72.1"
  });

  server.resource(
    "documentation",
    "helios://documentation",
    async (uri) => {
      const docs = findDocumentation(process.cwd(), options.skillsRoot);
      return {
        contents: [{
          uri: uri.href,
          text: JSON.stringify(docs, null, 2)
        }]
      };
    }
  );

  server.resource(
    "assets",
    "helios://assets",
    async (uri) => {
      const assets = await findAssets(process.cwd());
      return {
        contents: [{
          uri: uri.href,
          text: JSON.stringify(assets, null, 2)
        }]
      };
    }
  );

  server.resource(
    "components",
    "helios://components",
    async (uri) => {
      const components = options.components || [];
      const enriched = await Promise.all(components.map(async (c) => ({
          ...c,
          installed: options.onCheckInstalled ? await options.onCheckInstalled(c.name) : false
      })));
      return {
        contents: [{
          uri: uri.href,
          text: JSON.stringify(enriched, null, 2)
        }]
      };
    }
  );

  server.resource(
    "compositions",
    "helios://compositions",
    async (uri) => {
      const comps = await findCompositions(process.cwd());
      return {
        contents: [{
          uri: uri.href,
          text: JSON.stringify(comps, null, 2)
        }]
      };
    }
  );

  server.tool(
    "create_composition",
    {
      name: z.string(),
      template: z.enum(['vanilla', 'react', 'vue', 'svelte', 'solid', 'threejs']).optional(),
      width: z.number().optional(),
      height: z.number().optional(),
      fps: z.number().optional(),
      duration: z.number().optional()
    },
    async (args) => {
      try {
        // Only pass options if at least one is provided, otherwise let createComposition use defaults
        const options = (args.width !== undefined || args.height !== undefined || args.fps !== undefined || args.duration !== undefined)
          ? {
              width: args.width ?? 1920,
              height: args.height ?? 1080,
              fps: args.fps ?? 30,
              duration: args.duration ?? 5
            }
          : undefined;
        
        const result = createComposition(
            process.cwd(),
            args.name,
            args.template || 'vanilla',
            options
        );
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }]
        };
      } catch (e: any) {
        return {
          content: [{ type: "text", text: `Error: ${e.message}` }],
          isError: true
        };
      }
    }
  );

  server.tool(
    "render_composition",
    {
      compositionId: z.string(),
      width: z.number().optional(),
      height: z.number().optional(),
      fps: z.number().optional(),
      duration: z.number().optional()
    },
    async (args) => {
       try {
           const comps = await findCompositions(process.cwd());
           const comp = comps.find(c => c.id === args.compositionId);

           if (!comp) {
               return {
                   content: [{ type: "text", text: `Composition not found: ${args.compositionId}` }],
                   isError: true
               };
           }

           const port = getPort();
           const jobId = await startRender({
               compositionUrl: comp.url,
               width: args.width,
               height: args.height,
               fps: args.fps,
               duration: args.duration,
           }, port);

           return {
               content: [{ type: "text", text: JSON.stringify({ jobId, status: 'queued' }) }]
           };
       } catch (e: any) {
           return {
               content: [{ type: "text", text: `Error: ${e.message}` }],
               isError: true
           };
       }
    }
  );

  server.tool(
    "install_component",
    { name: z.string() },
    async (args) => {
      if (!options.onInstallComponent) return { content: [{ type: "text", text: "Feature not available" }], isError: true };
      try {
        await options.onInstallComponent(args.name);
        return { content: [{ type: "text", text: `Installed ${args.name}` }] };
      } catch (e: any) {
        return { content: [{ type: "text", text: `Error: ${e.message}` }], isError: true };
      }
    }
  );

  server.tool(
    "uninstall_component",
    { name: z.string() },
    async (args) => {
      if (!options.onRemoveComponent) return { content: [{ type: "text", text: "Feature not available" }], isError: true };
      try {
        await options.onRemoveComponent(args.name);
        return { content: [{ type: "text", text: `Uninstalled ${args.name}` }] };
      } catch (e: any) {
        return { content: [{ type: "text", text: `Error: ${e.message}` }], isError: true };
      }
    }
  );

  server.tool(
    "update_component",
    { name: z.string() },
    async (args) => {
      if (!options.onUpdateComponent) return { content: [{ type: "text", text: "Feature not available" }], isError: true };
      try {
        await options.onUpdateComponent(args.name);
        return { content: [{ type: "text", text: `Updated ${args.name}` }] };
      } catch (e: any) {
        return { content: [{ type: "text", text: `Error: ${e.message}` }], isError: true };
      }
    }
  );

  return server;
}
