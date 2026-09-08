import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { findCompositions, createComposition, findAssets } from './discovery';
import { startRender, cancelJob } from './render-manager';
import { getRenderStatus, getRenderOutput, readRenderOutput, requireJob, RenderAccessError, MAX_CHUNK_BYTES } from './render-access';
import { getProjectRoot } from './discovery';
import { StudioPluginOptions } from './types';
import { findDocumentation } from './documentation';

export function createMcpServer(getPort: () => number, options: StudioPluginOptions = {}) {
  const root = () => options.projectRoot ?? getProjectRoot(process.cwd());
  const json = (value: unknown) => ({ content: [{ type: 'text' as const, text: JSON.stringify(value) }] });
  const guarded = async (fn: () => Promise<unknown>) => {
    try { return json(await fn()); }
    catch (error) {
      return { ...json({ code: error instanceof RenderAccessError ? error.code : 'RENDER_ERROR', error: error instanceof RenderAccessError ? error.message : 'Render operation failed. Check Studio diagnostics.' }), isError: true };
    }
  };
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
      template: z.enum(['vanilla', 'react', 'vue', 'svelte', 'solid', 'threejs', 'title-explainer']).optional(),
      width: z.number().int().min(16).max(3840).optional(),
      height: z.number().int().min(16).max(2160).optional(),
      fps: z.number().int().min(1).max(60).optional(),
      duration: z.number().positive().max(300).optional(),
      defaultProps: z.record(z.string(), z.any()).optional()
    },
    async (args) => {
      try {
        // Only pass options if at least one is provided, otherwise let createComposition use defaults
        const options = (args.width !== undefined || args.height !== undefined || args.fps !== undefined || args.duration !== undefined || args.defaultProps !== undefined)
          ? {
              width: args.width ?? 1920,
              height: args.height ?? 1080,
              fps: args.fps ?? 30,
              duration: args.duration ?? 5,
              defaultProps: args.defaultProps
            }
          : undefined;
        
        const result = await createComposition(
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
      width: z.number().int().min(16).max(3840).optional(),
      height: z.number().int().min(16).max(2160).optional(),
      fps: z.number().int().min(1).max(60).optional(),
      duration: z.number().positive().max(300).optional(),
      mode: z.enum(['canvas', 'dom']).optional(),
      inputProps: z.record(z.string(), z.any()).optional(),
      videoBitrate: z.string().optional(),
      videoCodec: z.string().optional()
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
               // User-project HTML must pass through Vite's HTML transform;
               // /@fs serves raw HTML and leaves bare module imports unresolved.
               compositionUrl: options.projectRoot ? `/${[...comp.id.split('/').filter(Boolean), 'composition.html'].map(encodeURIComponent).join('/')}` : comp.url,
               compositionId: comp.id,
               width: args.width ?? comp.metadata?.width,
               height: args.height ?? comp.metadata?.height,
               fps: args.fps ?? comp.metadata?.fps,
               duration: args.duration ?? comp.metadata?.duration,
               mode: args.mode,
               // Image capture keeps the requested frame rate across platforms.
               webCodecsPreference: 'disabled',
               inputProps: args.inputProps,
               videoBitrate: args.videoBitrate,
               videoCodec: args.videoCodec
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

  server.tool('list_compositions', 'Discover composition IDs and render metadata in this project.', {}, async () => {
    const compositions = await findCompositions(process.cwd());
    return json({ compositions: compositions.map(({ id, name, metadata }) => ({ id, name, metadata })) });
  });
  server.tool('get_render_status', 'Inspect progress or wait up to 30 seconds. Wait expiry does not cancel the render.', {
    jobId: z.string(), waitMs: z.number().int().min(0).max(30000).optional(),
  }, (args, extra) => guarded(() => getRenderStatus(args.jobId, args.waitMs, extra.signal)));
  server.tool('cancel_render', 'Cancel a queued or running render. Terminal jobs retain their final state.', {
    jobId: z.string(),
  }, args => guarded(async () => {
    requireJob(args.jobId);
    const cancelled = await cancelJob(args.jobId);
    return { ...await getRenderStatus(args.jobId), cancelled };
  }));
  server.tool('get_render_output', 'Get completed MP4 metadata. The output path requires the same authentication as MCP.', {
    jobId: z.string(),
  }, args => guarded(() => getRenderOutput(args.jobId, root())));
  server.tool('read_render_output', 'Read a bounded base64 MP4 chunk over the authenticated MCP connection.', {
    jobId: z.string(), offset: z.number().int().min(0).optional(), length: z.number().int().min(1).max(MAX_CHUNK_BYTES).optional(),
  }, args => guarded(() => readRenderOutput(args.jobId, root(), args.offset, args.length)));

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
