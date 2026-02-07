import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { z } from "zod";
import { findCompositions, createComposition } from './discovery';
import { startRender } from './render-manager';

export function createMcpServer(getPort: () => number) {
  const server = new McpServer({
    name: "Helios Studio",
    version: "0.72.1"
  });

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

  return server;
}
